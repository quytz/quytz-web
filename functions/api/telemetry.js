/**
 * Cloudflare Pages Function - Auto-Discovering GitHub Gist Telemetry Handler
 * Endpoint: /api/telemetry
 * Automatically discovers or creates the telemetry.json Gist on the user's GitHub account.
 */

function getDefaultStats() {
  return {
    total_visitors: 0,
    last_updated: new Date().toISOString(),
    locations: {},
    imported_documents: { total: 0, pdf: 0, docx: 0, txt: 0, json: 0 },
    exam_modes: { practice: 0, exam: 0, flashcard: 0 },
    ai_features: { total_queries: 0, questions_generated: 0, explanations_asked: 0 },
    exports: { total: 0, json: 0, gift: 0, anki: 0, pdf: 0 }
  };
}

async function getOrCreateGistId(token, explicitGistId) {
  if (explicitGistId) return explicitGistId;

  const authHeader = token.startsWith("ghp_") ? `token ${token}` : `Bearer ${token}`;

  // 1. Search for existing telemetry Gist
  const listRes = await fetch("https://api.github.com/gists?per_page=50", {
    headers: {
      "Authorization": authHeader,
      "User-Agent": "QuizMaster-Telemetry",
      "Accept": "application/vnd.github.v3+json"
    }
  });

  if (listRes.ok) {
    const gists = await listRes.json();
    const existing = gists.find(g => g.files && g.files["telemetry.json"]);
    if (existing) {
      return existing.id;
    }
  }

  // 2. If not found, create new private Gist
  const createRes = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "User-Agent": "QuizMaster-Telemetry",
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      description: "QuizMaster Web Telemetry Database (Private & Anonymous)",
      public: false,
      files: {
        "telemetry.json": {
          content: JSON.stringify(getDefaultStats(), null, 2)
        }
      }
    })
  });

  if (createRes.ok) {
    const newGist = await createRes.json();
    return newGist.id;
  }

  return null;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export async function onRequestGet({ env }) {
  try {
    const token = env.GITHUB_TOKEN || env.GH_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({
        isConfigured: false,
        message: "Chưa cấu hình GITHUB_TOKEN trong Cloudflare Pages Settings > Variables and secrets.",
        stats: getDefaultStats()
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const gistId = await getOrCreateGistId(token, env.GIST_ID);
    if (!gistId) {
      return new Response(JSON.stringify({
        isConfigured: false,
        message: "Không thể tìm hoặc tạo Gist trên GitHub.",
        stats: getDefaultStats()
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const authHeader = token.startsWith("ghp_") ? `token ${token}` : `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/gists/${gistId}?_t=${Date.now()}`, {
      headers: {
        "Authorization": authHeader,
        "User-Agent": "QuizMaster-Telemetry",
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({
        isConfigured: false,
        error: `GitHub API error ${res.status}`,
        stats: getDefaultStats()
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const gistData = await res.json();
    const fileContent = gistData.files && gistData.files["telemetry.json"] ? gistData.files["telemetry.json"].content : null;
    const stats = fileContent ? JSON.parse(fileContent) : getDefaultStats();

    return new Response(JSON.stringify({
      isConfigured: true,
      gistId,
      stats
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stats: getDefaultStats() }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const token = env.GITHUB_TOKEN || env.GH_TOKEN;
    const incoming = await request.json();

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        warning: "Chưa có GITHUB_TOKEN trong Cloudflare Pages."
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const gistId = await getOrCreateGistId(token, env.GIST_ID);
    if (!gistId) {
      return new Response(JSON.stringify({
        success: false,
        warning: "Không thể lấy Gist ID."
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const authHeader = token.startsWith("ghp_") ? `token ${token}` : `Bearer ${token}`;

    // 1. Get current stats
    const getRes = await fetch(`https://api.github.com/gists/${gistId}?_t=${Date.now()}`, {
      headers: {
        "Authorization": authHeader,
        "User-Agent": "QuizMaster-Telemetry",
        "Accept": "application/vnd.github.v3+json"
      }
    });

    let current = getDefaultStats();
    if (getRes.ok) {
      const gistData = await getRes.json();
      if (gistData.files && gistData.files["telemetry.json"] && gistData.files["telemetry.json"].content) {
        try {
          current = { ...current, ...JSON.parse(gistData.files["telemetry.json"].content) };
        } catch {}
      }
    }

    // 2. Aggregate
    if (incoming.visitors) {
      current.total_visitors = (current.total_visitors || 0) + incoming.visitors;
    }

    const edgeCountry = request.cf?.country || null;
    const edgeCity = request.cf?.city || null;
    current.locations = current.locations || {};

    if (edgeCountry) {
      const locKey = edgeCity ? `${edgeCountry} - ${edgeCity}` : edgeCountry;
      current.locations[locKey] = (current.locations[locKey] || 0) + (incoming.visitors || 1);
    } else if (incoming.locations) {
      for (const [locKey, count] of Object.entries(incoming.locations)) {
        current.locations[locKey] = (current.locations[locKey] || 0) + count;
      }
    }

    if (incoming.imported_documents) {
      current.imported_documents = current.imported_documents || {};
      for (const [k, v] of Object.entries(incoming.imported_documents)) {
        current.imported_documents[k] = (current.imported_documents[k] || 0) + v;
      }
    }

    if (incoming.exam_modes) {
      current.exam_modes = current.exam_modes || {};
      for (const [k, v] of Object.entries(incoming.exam_modes)) {
        current.exam_modes[k] = (current.exam_modes[k] || 0) + v;
      }
    }

    if (incoming.ai_features) {
      current.ai_features = current.ai_features || {};
      for (const [k, v] of Object.entries(incoming.ai_features)) {
        current.ai_features[k] = (current.ai_features[k] || 0) + v;
      }
    }

    if (incoming.exports) {
      current.exports = current.exports || {};
      for (const [k, v] of Object.entries(incoming.exports)) {
        current.exports[k] = (current.exports[k] || 0) + v;
      }
    }

    current.last_updated = new Date().toISOString();

    // 3. Update Gist
    const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        "Authorization": authHeader,
        "User-Agent": "QuizMaster-Telemetry",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description: "QuizMaster Web Telemetry Database (Private & Anonymous)",
        files: {
          "telemetry.json": {
            content: JSON.stringify(current, null, 2)
          }
        }
      })
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      return new Response(JSON.stringify({ success: false, error: errText }), {
        status: patchRes.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(JSON.stringify({ success: true, last_updated: current.last_updated }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
