// api/claude.js — Vercel Serverless Function
// Đặt file này tại: /api/claude.js (root của project)
// API key nằm hoàn toàn ở server, browser không bao giờ thấy

export default async function handler(req, res) {
  // Chỉ chấp nhận POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Lấy API key từ environment variable (server-side, an toàn)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key chưa được cấu hình" });
  }

  try {
    const { system, messages, model, max_tokens } = req.body;

    // Validate input cơ bản
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Thiếu messages" });
    }

    // Gọi Anthropic API từ server
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-6",
        max_tokens: max_tokens || 1000,
        system,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Lỗi từ Anthropic API",
      });
    }

    // Trả kết quả về cho browser (không có API key trong response)
    return res.status(200).json(data);

  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Lỗi server: " + err.message });
  }
}
