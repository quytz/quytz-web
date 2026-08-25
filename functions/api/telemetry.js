/**
 * Cloudflare Pages Function - Auto-Discovering GitHub Gist Telemetry & Feedback Handler
 * Endpoint: /api/telemetry
 * Automatically discovers or creates the telemetry.json & feedback.json Gist on the user's GitHub account.
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
      description: "QuizMaster Web Telemetry & Feedback Database (Private)",
      public: false,
      files: {
        "telemetry.json": {
          content: JSON.stringify(getDefaultStats(), null, 2)
        },
        "feedback.json": {
          content: "[]"
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
        stats: getDefaultStats(),
        feedbacks: []
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
        stats: getDefaultStats(),
        feedbacks: []
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
        stats: getDefaultStats(),
        feedbacks: []
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const gistData = await res.json();
    const fileContent = gistData.files && gistData.files["telemetry.json"] ? gistData.files["telemetry.json"].content : null;
    const stats = fileContent ? JSON.parse(fileContent) : getDefaultStats();

    let feedbacks = [];
    if (gistData.files && gistData.files["feedback.json"] && gistData.files["feedback.json"].content) {
      try {
        feedbacks = JSON.parse(gistData.files["feedback.json"].content);
        if (!Array.isArray(feedbacks)) feedbacks = [];
      } catch {
        feedbacks = [];
      }
    }

    return new Response(JSON.stringify({
      isConfigured: true,
      gistId,
      stats,
      feedbacks
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stats: getDefaultStats(), feedbacks: [] }), {
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

    // --- CASE 1: USER SUBMITS FEEDBACK ---
    if (incoming.type === "feedback" || incoming.feedback) {
      const fbData = incoming.feedback || incoming;
      const getRes = await fetch(`https://api.github.com/gists/${gistId}?_t=${Date.now()}`, {
        headers: {
          "Authorization": authHeader,
          "User-Agent": "QuizMaster-Telemetry",
          "Accept": "application/vnd.github.v3+json"
        }
      });

      let feedbacks = [];
      let currentStats = getDefaultStats();

      if (getRes.ok) {
        const gistData = await getRes.json();
        if (gistData.files) {
          if (gistData.files["feedback.json"] && gistData.files["feedback.json"].content) {
            try {
              feedbacks = JSON.parse(gistData.files["feedback.json"].content);
              if (!Array.isArray(feedbacks)) feedbacks = [];
            } catch {}
          }
          if (gistData.files["telemetry.json"] && gistData.files["telemetry.json"].content) {
            try {
              currentStats = { ...currentStats, ...JSON.parse(gistData.files["telemetry.json"].content) };
            } catch {}
          }
        }
      }

      const edgeCountry = request.cf?.country || "VN";
      const edgeCity = request.cf?.city || "";

      const newFeedback = {
        id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        sectionId: fbData.sectionId || "bug",
        subCategory: fbData.subCategory || "Khác",
        title: fbData.title || "",
        message: fbData.message || "",
        contact: fbData.contact || "",
        logs: fbData.logs || null,
        systemInfo: fbData.systemInfo || null,
        country: edgeCountry,
        city: edgeCity,
        status: "new"
      };

      feedbacks.unshift(newFeedback);
      if (feedbacks.length > 500) {
        feedbacks = feedbacks.slice(0, 500);
      }

      currentStats.feedbacks = feedbacks;

      const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: {
          "Authorization": authHeader,
          "User-Agent": "QuizMaster-Telemetry",
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: {
            "feedback.json": {
              content: JSON.stringify(feedbacks, null, 2)
            },
            "telemetry.json": {
              content: JSON.stringify(currentStats, null, 2)
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

      return new Response(JSON.stringify({ success: true, feedbackId: newFeedback.id }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // --- CASE 2: ADMIN MANAGES FEEDBACK (Status update / Delete) ---
    if (incoming.type === "feedback_action") {
      const getRes = await fetch(`https://api.github.com/gists/${gistId}?_t=${Date.now()}`, {
        headers: {
          "Authorization": authHeader,
          "User-Agent": "QuizMaster-Telemetry",
          "Accept": "application/vnd.github.v3+json"
        }
      });

      let feedbacks = [];
      if (getRes.ok) {
        const gistData = await getRes.json();
        if (gistData.files && gistData.files["feedback.json"] && gistData.files["feedback.json"].content) {
          try {
            feedbacks = JSON.parse(gistData.files["feedback.json"].content);
            if (!Array.isArray(feedbacks)) feedbacks = [];
          } catch {}
        }
      }

      if (incoming.action === "delete") {
        feedbacks = feedbacks.filter(f => f.id !== incoming.id);
      } else if (incoming.action === "status") {
        feedbacks = feedbacks.map(f => f.id === incoming.id ? { ...f, status: incoming.status } : f);
      } else if (incoming.action === "clear_all") {
        feedbacks = [];
      }

      const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: {
          "Authorization": authHeader,
          "User-Agent": "QuizMaster-Telemetry",
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: {
            "feedback.json": {
              content: JSON.stringify(feedbacks, null, 2)
            }
          }
        })
      });

      return new Response(JSON.stringify({ success: patchRes.ok }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // --- CASE 3: TELEMETRY METRICS TRACKING ---
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

    // Aggregate
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

    // Update Gist
    const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        "Authorization": authHeader,
        "User-Agent": "QuizMaster-Telemetry",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description: "QuizMaster Web Telemetry & Feedback Database (Private)",
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

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return onRequestOptions();
    }
    if (request.method === "GET") {
      return onRequestGet({ request, env, ctx });
    }
    if (request.method === "POST") {
      return onRequestPost({ request, env, ctx });
    }
    return new Response("Method not allowed", { status: 405 });
  }
};

