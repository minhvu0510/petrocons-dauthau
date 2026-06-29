import { useState, useRef, useCallback } from "react";

// ─── Design tokens ──────────────────────────────────────────────────────────
// Palette: deep navy (#0B1F3A) primary, petroleum teal (#0E6E6E) accent,
// amber (#D4860B) highlight, warm white (#F5F3EF) surface, slate (#4A5568) text
// Typography: system-ui for utility data, weights 400/600/700
// Signature: a subtle "pipeline" horizontal rule — a dashed amber line
// punctuating section boundaries, referencing the physical product.

const COLORS = {
  navy: "#0B1F3A",
  navyLight: "#162D4F",
  teal: "#0E6E6E",
  tealLight: "#E6F4F4",
  amber: "#D4860B",
  amberLight: "#FEF3E2",
  surface: "#F5F3EF",
  white: "#FFFFFF",
  slate: "#4A5568",
  slateLight: "#718096",
  border: "#E2E0DB",
  danger: "#C53030",
  dangerLight: "#FFF5F5",
  success: "#276749",
  successLight: "#F0FFF4",
};

const MODULES = [
  { id: "analyze", label: "Phân tích HSMT", icon: "📋", short: "Phân tích" },
  { id: "compare", label: "So sánh Phiên bản", icon: "🔍", short: "So sánh" },
  { id: "draft",   label: "Soạn HSDT",      icon: "✍️",  short: "Soạn thảo" },
  { id: "price",   label: "Phân tích Giá",   icon: "📊",  short: "Phân tích Giá" },
  { id: "db",      label: "Nhà cung cấp",    icon: "🏭",  short: "Nhà cung cấp" },
  { id: "archive", label: "Kho Gói thầu",    icon: "🗄️",  short: "Kho lưu trữ" },
];

// ─── Supabase client (lightweight REST, không cần SDK) ──────────────────────
// Cấu hình qua biến môi trường VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

async function supabaseRequest(path, options = {}) {
  if (!supabaseConfigured) {
    throw new Error("Supabase chưa được cấu hình. Xem hướng dẫn kết nối Supabase.");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: options.method === "POST" ? "return=representation" : undefined,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase lỗi (${res.status}): ${errText}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function saveGoiThau(record) {
  return supabaseRequest("goi_thau", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

async function listGoiThau() {
  return supabaseRequest("goi_thau?select=*&order=created_at.desc");
}

async function deleteGoiThau(id) {
  return supabaseRequest(`goi_thau?id=eq.${id}`, { method: "DELETE" });
}

async function saveSoSanh(record) {
  return supabaseRequest("so_sanh_phien_ban", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

async function listSoSanh() {
  return supabaseRequest("so_sanh_phien_ban?select=*&order=created_at.desc");
}

async function deleteSoSanh(id) {
  return supabaseRequest(`so_sanh_phien_ban?id=eq.${id}`, { method: "DELETE" });
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function PipelineRule() {
  return (
    <div style={{
      borderTop: `2px dashed ${COLORS.amber}`,
      opacity: 0.35,
      margin: "20px 0",
    }} />
  );
}

function Badge({ color = COLORS.teal, bg = COLORS.tealLight, children }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
      color,
      background: bg,
    }}>
      {children}
    </span>
  );
}

function Btn({ onClick, disabled, variant = "primary", children, style = {} }) {
  const base = {
    border: "none",
    borderRadius: 6,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    transition: "opacity 0.15s",
    ...style,
  };
  const styles = {
    primary: { background: COLORS.teal, color: COLORS.white },
    secondary: { background: COLORS.surface, color: COLORS.navy, border: `1px solid ${COLORS.border}` },
    danger: { background: COLORS.danger, color: COLORS.white },
    amber: { background: COLORS.amber, color: COLORS.white },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...styles[variant] }}>
      {children}
    </button>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: COLORS.white,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      padding: "24px",
      marginBottom: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.navy }}>{title}</span>
      </div>
      {sub && <p style={{ margin: "4px 0 0 32px", color: COLORS.slateLight, fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: 16, height: 16,
      border: `2px solid ${COLORS.border}`,
      borderTop: `2px solid ${COLORS.teal}`,
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      verticalAlign: "middle",
      marginRight: 8,
    }} />
  );
}

// ─── API call ────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userContent, isMultipart = false, maxTokens = 4096) {
  const messages = isMultipart
    ? [{ role: "user", content: userContent }]
    : [{ role: "user", content: userContent }];

  // Gọi qua proxy /api/claude — API key an toàn ở server, không lộ ra browser
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.content.map(b => b.text || "").join("");
}

// ─── Module 1: Phân tích HSMT ────────────────────────────────────────────────

function AnalyzeModule() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [rawResult, setRawResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const fileRef = useRef();

  const handleFile = e => {
    const f = e.target.files[0];
    if (f) { setFile(f); setResult(null); setError(null); setRawResult(null); setSaved(false); setSaveError(null); }
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null); setRawResult(null);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Không đọc được file"));
        r.readAsDataURL(file);
      });

      const systemPrompt = `Bạn là chuyên gia phân tích hồ sơ mời thầu (HSMT) cho công ty xây lắp dầu khí PETROCONs. 
Trả lời bằng tiếng Việt, ngắn gọn, súc tích. 
Trả về JSON theo đúng cấu trúc sau, không thêm markdown hay text ngoài JSON:
{
  "ten_goi_thau": "...",
  "chu_dau_tu": "...",
  "gia_tri_uoc_tinh": "...",
  "han_nop": "...",
  "yeu_cau_chinh": ["...", "..."],
  "dieu_kien_tham_du": ["...", "..."],
  "rui_ro_can_luu_y": ["...", "..."],
  "tieu_chi_danh_gia": ["...", "..."],
  "to_chuc_lien_quan": [
    {"ten": "Tên đầy đủ của tổ chức/công ty/cá nhân được nhắc đến theo tên cụ thể trong hồ sơ", "vai_tro": "Sao chép NGUYÊN VĂN vai trò/chức danh được ghi trong hồ sơ (VD: 'Tư vấn lập thiết kế kỹ thuật, thiết kế bản vẽ thi công, dự toán', 'Tư vấn giám sát thi công xây dựng công trình', 'Tổ chức thẩm tra thiết kế'...)", "trang": "Số trang xuất hiện trong PDF"}
  ],
  "doi_tac_nha_thau_phu": [
    {"noi_dung": "Mô tả yêu cầu/điều kiện liên quan đến partner, nhà thầu phụ, liên danh, vendor cung cấp thiết bị/vật tư", "trang": "Số trang trong PDF chứa nội dung này, VD: 12 hoặc 12-13 nếu trải dài nhiều trang", "muc_do": "Cao hoặc Trung bình hoặc Thấp"}
  ],
  "xac_nhan_chu_dau_tu": [
    {"loai": "Xác nhận dự án tương tự / Xác nhận nhân sự / Xác nhận nghiệm thu / khác", "noi_dung": "Mô tả cụ thể yêu cầu xác nhận từ chủ đầu tư hoặc bên thứ 3, kèm hình thức xác nhận nếu có (văn bản, đóng dấu, thư xác nhận...)", "trang": "Số trang trong PDF chứa nội dung này, VD: 45 hoặc 45-46 nếu trải dài nhiều trang", "muc_do": "Cao hoặc Trung bình hoặc Thấp"}
  ]
}
TRƯỜNG "to_chuc_lien_quan" RẤT QUAN TRỌNG: đọc kỹ toàn bộ hồ sơ để liệt kê TẤT CẢ tên tổ chức, công ty, đơn vị, cá nhân được nhắc đến theo tên riêng cụ thể (không phải chung chung như "nhà thầu", "chủ đầu tư"). Bao gồm:
- Tên đơn vị lập/thẩm định HSMT, tư vấn giám sát, tư vấn thiết kế
- Tên tổ chức cấp chứng chỉ/tiêu chuẩn được nhắc đến (VD: ASTM, ISO, ASME...)
- Tên công ty/liên danh được đề cập trong ví dụ hoặc điều kiện tham chiếu
- Tên nhà sản xuất thiết bị hoặc xuất xứ được yêu cầu hoặc gợi ý
- Bất kỳ tên riêng nào của tổ chức xuất hiện trong hồ sơ
QUAN TRỌNG về trường "vai_tro": KHÔNG tự đặt nhãn hoặc phân loại lại — hãy SAO CHÉP NGUYÊN VĂN cụm từ mô tả vai trò của tổ chức đó ĐÚNG NHƯ ĐƯỢC VIẾT trong hồ sơ. Ví dụ đúng: "Tư vấn lập thiết kế kỹ thuật, thiết kế bản vẽ thi công (đối với công trình thiết kế hai bước), dự toán". Ví dụ sai (tự phân loại): "Tư vấn thiết kế".
Nếu không tìm thấy tên cụ thể nào, trả về mảng rỗng [].
Hai nhóm "doi_tac_nha_thau_phu" và "xac_nhan_chu_dau_tu" RẤT QUAN TRỌNG, cần đọc kỹ toàn bộ hồ sơ để tìm đầy đủ, không chỉ lấy từ phần tóm tắt đầu hồ sơ:
- "doi_tac_nha_thau_phu": mọi điều khoản về liên danh, nhà thầu phụ (subcontractor), đối tác cung cấp thiết bị/vật tư chính (vendor), yêu cầu năng lực của đối tác nếu liên danh, tỷ lệ phân chia công việc cho phép, giới hạn số nhà thầu phụ.
- "xac_nhan_chu_dau_tu": mọi yêu cầu cần có xác nhận/chứng thực từ chủ đầu tư dự án trước đó (xác nhận đã hoàn thành dự án tương tự), xác nhận năng lực nhân sự chủ chốt (CV, chứng chỉ được chủ đầu tư cũ xác nhận), xác nhận đã nghiệm thu/bàn giao công trình tương tự, hoặc bất kỳ loại thư xác nhận/xác thực nào được yêu cầu trong hồ sơ.
Nếu hồ sơ không có nội dung nào ở 1 nhóm, trả về mảng rỗng [] cho nhóm đó — không tự suy diễn hoặc bỏ qua việc đọc kỹ.
VỀ SỐ TRANG: bắt buộc ghi chính xác số trang PDF (đếm theo trang thực tế của file PDF, không phải số trang in trên văn bản nếu khác nhau) cho từng mục trong "doi_tac_nha_thau_phu" và "xac_nhan_chu_dau_tu". Nếu không xác định được chính xác trang nào, ghi "Không xác định" thay vì đoán bừa.
GIỚI HẠN ĐỘ DÀI (bắt buộc tuân thủ để tránh câu trả lời bị cắt):
- Mỗi trường "noi_dung" trong "doi_tac_nha_thau_phu" và "xac_nhan_chu_dau_tu": tối đa 2 câu ngắn, chỉ nêu đúng nội dung cốt lõi và số liệu quan trọng (% tỷ lệ, mốc thời gian), không diễn giải dài dòng.
- Tối đa 8 mục cho "doi_tac_nha_thau_phu" và tối đa 6 mục cho "xac_nhan_chu_dau_tu" — chọn những điều khoản quan trọng nhất, gộp các ý nhỏ liên quan lại thành 1 mục nếu cần.
- Mỗi mục trong "yeu_cau_chinh", "dieu_kien_tham_du", "rui_ro_can_luu_y", "tieu_chi_danh_gia": tối đa 1 câu ngắn.`;

      const userContent = [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        },
        { type: "text", text: "Phân tích hồ sơ mời thầu này theo cấu trúc JSON yêu cầu. Đặc biệt chú ý đọc kỹ toàn bộ hồ sơ (không chỉ phần tóm tắt) để tìm đầy đủ thông tin về đối tác/nhà thầu phụ và các yêu cầu xác nhận từ chủ đầu tư." },
      ];

      const raw = await callClaude(systemPrompt, userContent, true, 8192);
      const clean = raw.replace(/```json|```/g, "").trim();
      try {
        setResult(JSON.parse(clean));
      } catch (parseErr) {
        setRawResult(clean);
        setError("Không đọc được kết quả dạng có cấu trúc (có thể do hồ sơ quá dài). Nội dung thô AI trả về vẫn hiển thị phía dưới.");
      }
    } catch (e) {
      setError("Lỗi phân tích: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveToArchive = async () => {
    if (!result) return;
    setSaving(true); setSaveError(null);
    try {
      await saveGoiThau({
        ten_file: file?.name || null,
        ten_goi_thau: result.ten_goi_thau || null,
        chu_dau_tu: result.chu_dau_tu || null,
        gia_tri_uoc_tinh: result.gia_tri_uoc_tinh || null,
        han_nop: result.han_nop || null,
        yeu_cau_chinh: result.yeu_cau_chinh || [],
        dieu_kien_tham_du: result.dieu_kien_tham_du || [],
        rui_ro_can_luu_y: result.rui_ro_can_luu_y || [],
        tieu_chi_danh_gia: result.tieu_chi_danh_gia || [],
        doi_tac_nha_thau_phu: result.doi_tac_nha_thau_phu || [],
        xac_nhan_chu_dau_tu: result.xac_nhan_chu_dau_tu || [],
        to_chuc_lien_quan: result.to_chuc_lien_quan || [],
      });
      setSaved(true);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionTitle icon="📋" title="Phân tích Hồ sơ Mời thầu" sub="Upload PDF để AI tóm tắt yêu cầu, điều kiện tham dự và rủi ro cần lưu ý" />

      <Card>
        <div
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${file ? COLORS.teal : COLORS.border}`,
            borderRadius: 8,
            padding: "32px",
            textAlign: "center",
            cursor: "pointer",
            background: file ? COLORS.tealLight : COLORS.surface,
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          {file
            ? <><strong style={{ color: COLORS.teal }}>{file.name}</strong><br /><span style={{ fontSize: 12, color: COLORS.slateLight }}>{(file.size / 1024).toFixed(0)} KB</span></>
            : <><span style={{ color: COLORS.slateLight }}>Kéo thả hoặc click để chọn file PDF</span><br /><span style={{ fontSize: 12, color: COLORS.slateLight }}>Chỉ hỗ trợ PDF</span></>
          }
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} style={{ display: "none" }} />
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <Btn onClick={analyze} disabled={!file || loading} variant="primary">
            {loading ? <><Spinner />Đang phân tích...</> : "🔍 Phân tích HSMT"}
          </Btn>
          {file && <Btn onClick={() => { setFile(null); setResult(null); }} variant="secondary">Xoá file</Btn>}
        </div>
      </Card>

      {error && <Card style={{ background: COLORS.dangerLight, border: `1px solid ${COLORS.danger}` }}>
        <span style={{ color: COLORS.danger }}>⚠️ {error}</span>
      </Card>}

      {rawResult && (
        <Card style={{ background: COLORS.amberLight, border: `1px solid ${COLORS.amber}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 10 }}>📄 Nội dung thô từ AI (chưa định dạng được)</div>
          <div style={{
            whiteSpace: "pre-wrap", fontSize: 12, color: COLORS.slate, fontFamily: "monospace",
            background: COLORS.white, padding: 12, borderRadius: 6, maxHeight: 400, overflow: "auto",
          }}>
            {rawResult}
          </div>
        </Card>
      )}

      {result && (
        <div>
          {(result.to_chuc_lien_quan || []).length > 0 && (
            <Card style={{ borderLeft: `5px solid ${COLORS.teal}`, background: COLORS.tealLight }}>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 12, fontSize: 15 }}>
                🏢 Các tổ chức được nhắc đến theo tên trong hồ sơ
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.to_chuc_lien_quan.map((o, i) => (
                  <div key={i} style={{
                    background: COLORS.white,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 12,
                  }}>
                  <div style={{ fontWeight: 700, color: COLORS.navy }}>{o.ten}</div>
                    <div style={{ color: COLORS.slate, marginTop: 2, fontSize: 11, lineHeight: 1.5 }}>
                      {o.vai_tro}
                    </div>
                    {o.trang && <div style={{ color: COLORS.teal, marginTop: 2, fontSize: 10 }}>📄 Tr.{o.trang}</div>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {((result.doi_tac_nha_thau_phu || []).length > 0 || (result.xac_nhan_chu_dau_tu || []).length > 0) && (
            <Card style={{ borderLeft: `5px solid ${COLORS.amber}`, background: COLORS.amberLight }}>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 15 }}>
                🔑 Điểm cần lưu ý đặc biệt: Đối tác & Xác nhận từ Chủ đầu tư
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, marginBottom: 10, textTransform: "uppercase" }}>🤝 Đối tác / Nhà thầu phụ / Vendor</div>
                  {(result.doi_tac_nha_thau_phu || []).length === 0
                    ? <span style={{ fontSize: 13, color: COLORS.slateLight }}>Không có yêu cầu cụ thể trong hồ sơ</span>
                    : result.doi_tac_nha_thau_phu.map((d, i) => (
                      <div key={i} style={{
                        background: COLORS.white, borderRadius: 6, padding: 10, marginBottom: 8,
                        borderLeft: `3px solid ${d.muc_do === "Cao" ? COLORS.danger : d.muc_do === "Trung bình" ? COLORS.amber : COLORS.slateLight}`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          {d.trang && <span style={{ fontSize: 11, color: COLORS.teal, fontWeight: 700 }}>📄 Trang {d.trang}</span>}
                          <Badge color={d.muc_do === "Cao" ? COLORS.danger : d.muc_do === "Trung bình" ? COLORS.amber : COLORS.slateLight}
                                 bg={d.muc_do === "Cao" ? COLORS.dangerLight : d.muc_do === "Trung bình" ? COLORS.amberLight : COLORS.surface}>
                            {d.muc_do}
                          </Badge>
                        </div>
                        <div style={{ fontSize: 13, color: COLORS.slate }}>{d.noi_dung}</div>
                      </div>
                    ))
                  }
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, marginBottom: 10, textTransform: "uppercase" }}>✍️ Xác nhận từ Chủ đầu tư</div>
                  {(result.xac_nhan_chu_dau_tu || []).length === 0
                    ? <span style={{ fontSize: 13, color: COLORS.slateLight }}>Không có yêu cầu cụ thể trong hồ sơ</span>
                    : result.xac_nhan_chu_dau_tu.map((d, i) => (
                      <div key={i} style={{
                        background: COLORS.white, borderRadius: 6, padding: 10, marginBottom: 8,
                        borderLeft: `3px solid ${d.muc_do === "Cao" ? COLORS.danger : d.muc_do === "Trung bình" ? COLORS.amber : COLORS.slateLight}`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <strong style={{ fontSize: 12, color: COLORS.navy }}>{d.loai}</strong>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {d.trang && <span style={{ fontSize: 11, color: COLORS.teal, fontWeight: 700 }}>📄 Trang {d.trang}</span>}
                            <Badge color={d.muc_do === "Cao" ? COLORS.danger : d.muc_do === "Trung bình" ? COLORS.amber : COLORS.slateLight}
                                   bg={d.muc_do === "Cao" ? COLORS.dangerLight : d.muc_do === "Trung bình" ? COLORS.amberLight : COLORS.surface}>
                              {d.muc_do}
                            </Badge>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: COLORS.slate }}>{d.noi_dung}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </Card>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 12 }}>📌 Thông tin chung</div>
              {[
                ["Tên gói thầu", result.ten_goi_thau],
                ["Chủ đầu tư", result.chu_dau_tu],
                ["Giá trị ước tính", result.gia_tri_uoc_tinh],
                ["Hạn nộp", result.han_nop],
              ].map(([k, v]) => (
                <div key={k} style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: COLORS.slateLight, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</span>
                  <div style={{ fontWeight: 600, color: COLORS.navy, fontSize: 14 }}>{v || "—"}</div>
                </div>
              ))}
            </Card>

            <Card>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 12 }}>⚠️ Rủi ro cần lưu ý</div>
              {(result.rui_ro_can_luu_y || []).map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: COLORS.amber, fontWeight: 700, flexShrink: 0 }}>!</span>
                  <span style={{ color: COLORS.slate }}>{r}</span>
                </div>
              ))}
            </Card>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 12 }}>📋 Yêu cầu chính</div>
              {(result.yeu_cau_chinh || []).map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: COLORS.slate }}>
                  <span style={{ color: COLORS.teal }}>▸</span>{r}
                </div>
              ))}
            </Card>
            <Card>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 12 }}>✅ Điều kiện tham dự</div>
              {(result.dieu_kien_tham_du || []).map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: COLORS.slate }}>
                  <span style={{ color: COLORS.teal }}>▸</span>{r}
                </div>
              ))}
            </Card>
          </div>

          <Card style={{ background: saved ? COLORS.successLight : COLORS.surface, border: `1px solid ${saved ? COLORS.success : COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: COLORS.slate }}>
                {saved
                  ? "✅ Đã lưu vào Kho Gói thầu — xem lại tại tab Kho lưu trữ"
                  : "Lưu kết quả phân tích này vào database để tra cứu lại sau"}
              </div>
              {!saved && (
                <Btn onClick={saveToArchive} disabled={saving} variant="amber">
                  {saving ? <><Spinner />Đang lưu...</> : "💾 Lưu vào Kho"}
                </Btn>
              )}
            </div>
            {saveError && <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 8 }}>⚠️ {saveError}</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Module 1b: So sánh Phiên bản HSMT ───────────────────────────────────────

function CompareModule() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [rawResult, setRawResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const fileARef = useRef();
  const fileBRef = useRef();

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Không đọc được file " + file.name));
    r.readAsDataURL(file);
  });

  const compare = async () => {
    if (!fileA || !fileB) return;
    setLoading(true); setError(null); setResult(null); setRawResult(null); setSaved(false); setSaveError(null);
    try {
      const [base64A, base64B] = await Promise.all([toBase64(fileA), toBase64(fileB)]);

      const systemPrompt = `Bạn là chuyên gia phân tích hồ sơ mời thầu (HSMT) cho công ty xây lắp dầu khí PETROCONs.
Bạn sẽ nhận 2 phiên bản HSMT của cùng một gói thầu (phiên bản cũ và phiên bản mới hơn, có thể là bản sửa đổi/gia hạn).
Nhiệm vụ: tìm và liệt kê CHÍNH XÁC những điểm khác biệt giữa 2 bản — không suy diễn, không bỏ sót.
Trả lời bằng tiếng Việt. Trả về JSON theo đúng cấu trúc sau, không thêm markdown hay text ngoài JSON:
{
  "tom_tat_thay_doi": "Tóm tắt ngắn 1-2 câu về bản chất của lần sửa đổi này",
  "thay_doi_quan_trong": [
    {"muc": "Tên mục/điều khoản thay đổi", "ban_cu": "Nội dung ở bản cũ", "ban_moi": "Nội dung ở bản mới", "trang_cu": "Số trang trong PDF bản cũ", "trang_moi": "Số trang trong PDF bản mới", "muc_do": "Cao hoặc Trung bình hoặc Thấp"}
  ],
  "thay_doi_thoi_gian": [
    {"noi_dung": "VD: Hạn nộp hồ sơ", "ban_cu": "...", "ban_moi": "...", "trang_cu": "Số trang bản cũ", "trang_moi": "Số trang bản mới"}
  ],
  "thay_doi_ky_thuat": ["Mô tả thay đổi yêu cầu kỹ thuật, nếu có"],
  "thay_doi_thuong_mai": ["Mô tả thay đổi điều khoản giá, bảo lãnh, thanh toán, nếu có"],
  "khuyen_nghi_hanh_dong": ["Việc cụ thể team thương mại cần làm/cập nhật trong HSDT do thay đổi này"]
}
Nếu không có thay đổi ở một nhóm nào, trả về mảng rỗng [] cho nhóm đó. Mức độ "Cao" dành cho thay đổi ảnh hưởng trực tiếp đến khả năng trúng thầu hoặc tuân thủ (deadline, tiêu chí loại, giá trị bảo lãnh...).
VỀ SỐ TRANG: với mỗi mục trong "thay_doi_quan_trong" và "thay_doi_thoi_gian", ghi chính xác số trang PDF (đếm theo trang thực tế của file, không phải số trang in trên văn bản nếu khác) nơi tìm thấy nội dung đó ở mỗi bản — bạn đang đọc trực tiếp cả 2 file PDF nên có thể xác định chính xác. Nếu không xác định được, ghi "Không xác định" thay vì bỏ trống hoặc đoán bừa.
QUAN TRỌNG: mỗi trường "ban_cu"/"ban_moi"/mô tả chỉ viết tối đa 1-2 câu ngắn, súc tích, không trích dẫn nguyên văn dài. Giới hạn "thay_doi_quan_trong" tối đa 12 mục quan trọng nhất, không liệt kê toàn bộ chi tiết nhỏ.`;

      const userContent = [
        { type: "text", text: "ĐÂY LÀ BẢN CŨ (phiên bản trước):" },
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64A } },
        { type: "text", text: "ĐÂY LÀ BẢN MỚI (phiên bản sau):" },
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64B } },
        { type: "text", text: "So sánh 2 bản HSMT trên, tìm điểm khác biệt theo đúng cấu trúc JSON yêu cầu." },
      ];

      const raw = await callClaude(systemPrompt, userContent, true, 8192);
      const clean = raw.replace(/```json|```/g, "").trim();
      try {
        setResult(JSON.parse(clean));
      } catch (parseErr) {
        // JSON bị lỗi cấu trúc (thường do bị cắt giữa đường) — vẫn giữ lại nội dung thô
        // để không mất trắng kết quả đã tốn token lấy về
        setRawResult(clean);
        setError("Không đọc được kết quả dạng có cấu trúc (có thể do hồ sơ quá dài). Nội dung thô AI trả về vẫn hiển thị phía dưới.");
      }
    } catch (e) {
      setError("Lỗi so sánh: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveToArchiveCompare = async () => {
    if (!result) return;
    setSaving(true); setSaveError(null);
    try {
      await saveSoSanh({
        ten_file_cu: fileA?.name || null,
        ten_file_moi: fileB?.name || null,
        ten_goi_thau: result.tom_tat_thay_doi || null,
        tom_tat_thay_doi: result.tom_tat_thay_doi || null,
        thay_doi_quan_trong: result.thay_doi_quan_trong || [],
        thay_doi_thoi_gian: result.thay_doi_thoi_gian || [],
        thay_doi_ky_thuat: result.thay_doi_ky_thuat || [],
        thay_doi_thuong_mai: result.thay_doi_thuong_mai || [],
        khuyen_nghi_hanh_dong: result.khuyen_nghi_hanh_dong || [],
      });
      setSaved(true);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const FileSlot = ({ label, file, setFile, inputRef }) => (
    <div
      onClick={() => inputRef.current.click()}
      style={{
        border: `2px dashed ${file ? COLORS.teal : COLORS.border}`,
        borderRadius: 8,
        padding: "24px",
        textAlign: "center",
        cursor: "pointer",
        background: file ? COLORS.tealLight : COLORS.surface,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 11, color: COLORS.slateLight, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
      {file
        ? <strong style={{ color: COLORS.teal, fontSize: 13 }}>{file.name}</strong>
        : <span style={{ color: COLORS.slateLight, fontSize: 13 }}>Click để chọn PDF</span>
      }
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setResult(null); setError(null); } }}
        style={{ display: "none" }}
      />
    </div>
  );

  const muc_do_color = (m) => m === "Cao" ? COLORS.danger : m === "Trung bình" ? COLORS.amber : COLORS.slateLight;
  const muc_do_bg = (m) => m === "Cao" ? COLORS.dangerLight : m === "Trung bình" ? COLORS.amberLight : COLORS.surface;

  return (
    <div>
      <SectionTitle icon="🔍" title="So sánh Phiên bản HSMT" sub="Upload 2 bản HSMT (cũ và mới) để AI tìm chính xác điểm khác biệt cần cập nhật vào HSDT" />

      <Card>
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <FileSlot label="Bản cũ (VD: lần 3)" file={fileA} setFile={setFileA} inputRef={fileARef} />
          <div style={{ display: "flex", alignItems: "center", fontSize: 20, color: COLORS.slateLight }}>→</div>
          <FileSlot label="Bản mới (VD: lần 4)" file={fileB} setFile={setFileB} inputRef={fileBRef} />
        </div>
        <Btn onClick={compare} disabled={!fileA || !fileB || loading} variant="primary">
          {loading ? <><Spinner />Đang so sánh (có thể mất 30-60s với hồ sơ dài)...</> : "🔍 So sánh 2 phiên bản"}
        </Btn>
      </Card>

      {error && <Card style={{ background: COLORS.dangerLight, border: `1px solid ${COLORS.danger}` }}>
        <span style={{ color: COLORS.danger }}>⚠️ {error}</span>
      </Card>}

      {rawResult && (
        <Card style={{ background: COLORS.amberLight, border: `1px solid ${COLORS.amber}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 10 }}>📄 Nội dung thô từ AI (chưa định dạng được)</div>
          <div style={{
            whiteSpace: "pre-wrap",
            fontSize: 12,
            color: COLORS.slate,
            fontFamily: "monospace",
            background: COLORS.white,
            padding: 12,
            borderRadius: 6,
            maxHeight: 400,
            overflow: "auto",
          }}>
            {rawResult}
          </div>
        </Card>
      )}

      {result && (
        <div>
          <Card style={{ borderLeft: `4px solid ${COLORS.teal}`, background: COLORS.tealLight }}>
            <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 6 }}>📝 Tóm tắt thay đổi</div>
            <p style={{ margin: 0, fontSize: 14, color: COLORS.slate, lineHeight: 1.6 }}>{result.tom_tat_thay_doi}</p>
          </Card>

          {(result.thay_doi_quan_trong || []).length > 0 && (
            <Card>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14 }}>⚡ Thay đổi quan trọng</div>
              {result.thay_doi_quan_trong.map((t, i) => (
                <div key={i} style={{
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `4px solid ${muc_do_color(t.muc_do)}`,
                  borderRadius: 6,
                  padding: 14,
                  marginBottom: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ color: COLORS.navy, fontSize: 14 }}>{t.muc}</strong>
                    <Badge color={muc_do_color(t.muc_do)} bg={muc_do_bg(t.muc_do)}>{t.muc_do}</Badge>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: COLORS.slateLight, textTransform: "uppercase" }}>Bản cũ</span>
                        {t.trang_cu && <span style={{ fontSize: 10, color: COLORS.teal, fontWeight: 700 }}>📄 Tr.{t.trang_cu}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: COLORS.slate, background: COLORS.dangerLight, padding: 8, borderRadius: 4 }}>{t.ban_cu}</div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: COLORS.slateLight, textTransform: "uppercase" }}>Bản mới</span>
                        {t.trang_moi && <span style={{ fontSize: 10, color: COLORS.teal, fontWeight: 700 }}>📄 Tr.{t.trang_moi}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: COLORS.slate, background: COLORS.successLight, padding: 8, borderRadius: 4 }}>{t.ban_moi}</div>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {(result.thay_doi_thoi_gian || []).length > 0 && (
            <Card>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 12 }}>📅 Thay đổi thời gian / hạn nộp</div>
              {result.thay_doi_thoi_gian.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, fontSize: 13, flexWrap: "wrap" }}>
                  <span style={{ color: COLORS.navy, fontWeight: 600, minWidth: 140 }}>{t.noi_dung}</span>
                  <span style={{ color: COLORS.danger, textDecoration: "line-through" }}>{t.ban_cu}</span>
                  {t.trang_cu && <span style={{ fontSize: 10, color: COLORS.teal }}>(Tr.{t.trang_cu})</span>}
                  <span style={{ color: COLORS.slateLight }}>→</span>
                  <span style={{ color: COLORS.success, fontWeight: 600 }}>{t.ban_moi}</span>
                  {t.trang_moi && <span style={{ fontSize: 10, color: COLORS.teal }}>(Tr.{t.trang_moi})</span>}
                </div>
              ))}
            </Card>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 12 }}>🔧 Thay đổi kỹ thuật</div>
              {(result.thay_doi_ky_thuat || []).length === 0
                ? <span style={{ fontSize: 13, color: COLORS.slateLight }}>Không có thay đổi</span>
                : result.thay_doi_ky_thuat.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: COLORS.slate }}>
                    <span style={{ color: COLORS.teal }}>▸</span>{r}
                  </div>
                ))
              }
            </Card>
            <Card>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 12 }}>💰 Thay đổi thương mại</div>
              {(result.thay_doi_thuong_mai || []).length === 0
                ? <span style={{ fontSize: 13, color: COLORS.slateLight }}>Không có thay đổi</span>
                : result.thay_doi_thuong_mai.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: COLORS.slate }}>
                    <span style={{ color: COLORS.teal }}>▸</span>{r}
                  </div>
                ))
              }
            </Card>
          </div>

          {(result.khuyen_nghi_hanh_dong || []).length > 0 && (
            <Card style={{ borderLeft: `4px solid ${COLORS.amber}` }}>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 12 }}>✅ Việc cần làm ngay</div>
              {result.khuyen_nghi_hanh_dong.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: COLORS.slate }}>
                  <span style={{ color: COLORS.amber, fontWeight: 700 }}>{i + 1}.</span>{r}
                </div>
              ))}
            </Card>
          )}

          <Card style={{ background: saved ? COLORS.successLight : COLORS.surface, border: `1px solid ${saved ? COLORS.success : COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: COLORS.slate }}>
                {saved
                  ? "✅ Đã lưu vào Kho Gói thầu — xem lại tại tab Kho lưu trữ"
                  : "Lưu kết quả so sánh này vào database để tra cứu lại sau (kết quả tốn token, nên lưu lại để không phải so sánh lại từ đầu)"}
              </div>
              {!saved && (
                <Btn onClick={saveToArchiveCompare} disabled={saving} variant="amber">
                  {saving ? <><Spinner />Đang lưu...</> : "💾 Lưu vào Kho"}
                </Btn>
              )}
            </div>
            {saveError && <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 8 }}>⚠️ {saveError}</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Module 2: Soạn HSDT ─────────────────────────────────────────────────────

const TEMPLATES = {
  nang_luc: "Năng lực công ty",
  kinh_nghiem: "Kinh nghiệm tương tự",
  phuong_an: "Phương án tổ chức thi công",
  cam_ket: "Cam kết tiến độ & chất lượng",
};

function DraftModule() {
  const [loai, setLoai] = useState("nang_luc");
  const [goiThau, setGoiThau] = useState("");
  const [chuDauTu, setChuDauTu] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true); setResult(null);
    try {
      const systemPrompt = `Bạn là chuyên gia soạn thảo hồ sơ dự thầu cho Tổng Công ty Cổ phần Xây lắp Dầu khí Việt Nam (PETROCONs).
Viết bằng tiếng Việt, giọng văn chuyên nghiệp, phù hợp hồ sơ đấu thầu xây lắp công nghiệp/dầu khí.
Chỉ trả về nội dung văn bản, không thêm giải thích ngoài.`;

      const prompt = `Soạn phần "${TEMPLATES[loai]}" cho hồ sơ dự thầu:
- Tên gói thầu: ${goiThau || "Gói thầu xây lắp công nghiệp"}
- Chủ đầu tư: ${chuDauTu || "Tập đoàn Dầu khí Việt Nam"}
- Ghi chú thêm: ${ghiChu || "Không có"}

Viết khoảng 250-350 từ, ngôn ngữ trang trọng, chuyên ngành xây lắp dầu khí.`;

      const text = await callClaude(systemPrompt, prompt);
      setResult(text);
    } catch (e) {
      setResult("Lỗi: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <SectionTitle icon="✍️" title="Soạn thảo Hồ sơ Dự thầu" sub="AI tạo nội dung chuẩn từng phần của HSDT dựa trên thông tin gói thầu" />

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Loại nội dung cần soạn</label>
            <select value={loai} onChange={e => setLoai(e.target.value)} style={inputStyle}>
              {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tên gói thầu</label>
            <input value={goiThau} onChange={e => setGoiThau(e.target.value)} placeholder="VD: Thi công hệ thống bồn chứa LPG..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Chủ đầu tư</label>
            <input value={chuDauTu} onChange={e => setChuDauTu(e.target.value)} placeholder="VD: PV Gas, BSR, PTSC..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Yêu cầu / ghi chú thêm</label>
            <input value={ghiChu} onChange={e => setGhiChu(e.target.value)} placeholder="VD: nhấn mạnh dự án Thái Bình 2, offshore..." style={inputStyle} />
          </div>
        </div>

        <Btn onClick={generate} disabled={loading} variant="primary">
          {loading ? <><Spinner />Đang soạn...</> : "✍️ Tạo nội dung"}
        </Btn>
      </Card>

      {result && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: COLORS.navy }}>{TEMPLATES[loai]}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={copy} variant="secondary" style={{ padding: "6px 14px", fontSize: 13 }}>
                {copied ? "✅ Đã copy" : "📋 Copy"}
              </Btn>
              <Btn onClick={generate} variant="secondary" style={{ padding: "6px 14px", fontSize: 13 }}>🔄 Tạo lại</Btn>
            </div>
          </div>
          <PipelineRule />
          <div style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.75,
            fontSize: 14,
            color: COLORS.slate,
            fontFamily: "Georgia, serif",
          }}>
            {result}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Module 3: Phân tích Giá ─────────────────────────────────────────────────

function PriceModule() {
  const [goiThau, setGoiThau] = useState("");
  const [loaiCT, setLoaiCT] = useState("Xây lắp công nghiệp");
  const [giaTriDT, setGiaTriDT] = useState("");
  const [doiThu, setDoiThu] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const analyze = async () => {
    setLoading(true); setResult(null);
    try {
      const systemPrompt = `Bạn là chuyên gia phân tích giá thầu trong lĩnh vực xây lắp dầu khí Việt Nam.
Trả về JSON theo cấu trúc sau, không thêm text ngoài JSON:
{
  "gia_de_xuat": "...",
  "margin_khuyen_nghi": "...",
  "phan_tich_canh_tranh": "...",
  "cac_yeu_to_anh_huong_gia": ["...", "..."],
  "rui_ro_gia": ["...", "..."],
  "kich_ban": [
    {"ten": "Bảo thủ", "bien_do": "...", "kha_nang_thang": "...", "nhan_xet": "..."},
    {"ten": "Cân bằng", "bien_do": "...", "kha_nang_thang": "...", "nhan_xet": "..."},
    {"ten": "Cạnh tranh", "bien_do": "...", "kha_nang_thang": "...", "nhan_xet": "..."}
  ],
  "khuyen_nghi": "..."
}`;

      const prompt = `Phân tích chiến lược giá thầu:
- Tên gói thầu: ${goiThau || "Gói thầu xây lắp"}
- Loại công trình: ${loaiCT}
- Giá trị dự toán chủ đầu tư: ${giaTriDT || "Chưa có thông tin"}
- Đối thủ cạnh tranh dự kiến: ${doiThu || "PVC, Lilama, PTSC"}

Phân tích dựa trên thực tế thị trường xây lắp dầu khí Việt Nam hiện nay.`;

      const raw = await callClaude(systemPrompt, prompt);
      const clean = raw.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch (e) {
      setResult({ error: "Lỗi phân tích: " + e.message });
    } finally {
      setLoading(false);
    }
  };

  const scenarioColors = [
    { border: COLORS.slateLight, bg: COLORS.surface },
    { border: COLORS.teal, bg: COLORS.tealLight },
    { border: COLORS.amber, bg: COLORS.amberLight },
  ];

  return (
    <div>
      <SectionTitle icon="📊" title="Phân tích Chiến lược Giá" sub="AI phân tích kịch bản giá tối ưu dựa trên loại công trình và đối thủ cạnh tranh" />

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Tên gói thầu</label>
            <input value={goiThau} onChange={e => setGoiThau(e.target.value)} placeholder="VD: Lắp đặt bồn chứa xăng dầu..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Loại công trình</label>
            <select value={loaiCT} onChange={e => setLoaiCT(e.target.value)} style={inputStyle}>
              {["Xây lắp công nghiệp", "Xây lắp dầu khí offshore", "EPC nhà máy", "Hạ tầng dân dụng", "Bồn bể, kho cảng"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Giá trị dự toán (VNĐ)</label>
            <input value={giaTriDT} onChange={e => setGiaTriDT(e.target.value)} placeholder="VD: 50 tỷ, 200 tỷ..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Đối thủ cạnh tranh dự kiến</label>
            <input value={doiThu} onChange={e => setDoiThu(e.target.value)} placeholder="VD: PVC, Lilama, PTSC..." style={inputStyle} />
          </div>
        </div>
        <Btn onClick={analyze} disabled={loading} variant="primary">
          {loading ? <><Spinner />Đang phân tích...</> : "📊 Phân tích giá"}
        </Btn>
      </Card>

      {result && !result.error && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card style={{ borderLeft: `4px solid ${COLORS.teal}` }}>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>Đề xuất giá</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.teal }}>{result.gia_de_xuat}</div>
              <div style={{ fontSize: 13, color: COLORS.slateLight, marginTop: 4 }}>Margin khuyến nghị: <strong>{result.margin_khuyen_nghi}</strong></div>
            </Card>
            <Card>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 8 }}>Nhận xét cạnh tranh</div>
              <p style={{ fontSize: 13, color: COLORS.slate, margin: 0, lineHeight: 1.6 }}>{result.phan_tich_canh_tranh}</p>
            </Card>
          </div>

          <Card>
            <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 16 }}>📈 Các kịch bản giá</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {(result.kich_ban || []).map((kb, i) => (
                <div key={i} style={{
                  border: `2px solid ${scenarioColors[i].border}`,
                  background: scenarioColors[i].bg,
                  borderRadius: 8,
                  padding: 16,
                }}>
                  <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 6 }}>{kb.ten}</div>
                  <div style={{ fontSize: 13, color: COLORS.slate, marginBottom: 4 }}>Biên độ: <strong>{kb.bien_do}</strong></div>
                  <div style={{ fontSize: 13, color: COLORS.slate, marginBottom: 8 }}>Khả năng thắng: <strong style={{ color: COLORS.teal }}>{kb.kha_nang_thang}</strong></div>
                  <div style={{ fontSize: 12, color: COLORS.slateLight, lineHeight: 1.5 }}>{kb.nhan_xet}</div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 10 }}>⚠️ Rủi ro về giá</div>
              {(result.rui_ro_gia || []).map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: COLORS.slate }}>
                  <span style={{ color: COLORS.amber }}>!</span>{r}
                </div>
              ))}
            </Card>
            <Card style={{ borderLeft: `4px solid ${COLORS.amber}` }}>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 10 }}>💡 Khuyến nghị</div>
              <p style={{ fontSize: 13, color: COLORS.slate, margin: 0, lineHeight: 1.7 }}>{result.khuyen_nghi}</p>
            </Card>
          </div>
        </div>
      )}
      {result?.error && (
        <Card style={{ background: COLORS.dangerLight }}>
          <span style={{ color: COLORS.danger }}>{result.error}</span>
        </Card>
      )}
    </div>
  );
}

// ─── Module 4: Danh bạ Nhà cung cấp ─────────────────────────────────────────

const LINH_VUC_OPTIONS = [
  "Van", "Bolt & Fastener", "PCCC", "Cảm biến & Đo lường",
  "Bảo ôn", "Thiết bị điện", "Hydraulic", "Làm sạch công nghiệp",
  "Xử lý nước", "Kiểm soát khí thải", "An toàn", "Khác"
];

const MUC_DO_OPTIONS = ["Cao", "Trung bình", "Thấp"];

async function saveNhaCungCap(record) {
  return supabaseRequest("nha_cung_cap", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

async function updateNhaCungCap(id, record) {
  return supabaseRequest(`nha_cung_cap?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(record),
  });
}

async function listNhaCungCap() {
  return supabaseRequest("nha_cung_cap?select=*&order=created_at.desc");
}

async function deleteNhaCungCap(id) {
  return supabaseRequest(`nha_cung_cap?id=eq.${id}`, { method: "DELETE" });
}

const EMPTY_FORM = {
  ten_cong_ty: "", san_pham: "", linh_vuc: [], nguon: "ENTECH Vietnam 2026",
  quoc_gia: "Hàn Quốc", website: "", nguoi_lien_he: "", chuc_vu: "",
  dien_thoai: "", email: "", ghi_chu: "", muc_do_quan_tam: "Trung bình", da_lien_he: false,
};

function SupplierModule() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterLinh, setFilterLinh] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await listNhaCungCap() || []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useState(() => { load(); });

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({
      ten_cong_ty: item.ten_cong_ty || "",
      san_pham: item.san_pham || "",
      linh_vuc: item.linh_vuc || [],
      nguon: item.nguon || "",
      quoc_gia: item.quoc_gia || "",
      website: item.website || "",
      nguoi_lien_he: item.nguoi_lien_he || "",
      chuc_vu: item.chuc_vu || "",
      dien_thoai: item.dien_thoai || "",
      email: item.email || "",
      ghi_chu: item.ghi_chu || "",
      muc_do_quan_tam: item.muc_do_quan_tam || "Trung bình",
      da_lien_he: item.da_lien_he || false,
    });
    setEditId(item.id);
    setShowForm(true);
  };

  const toggleLinh = (v) => setForm(f => ({
    ...f,
    linh_vuc: f.linh_vuc.includes(v) ? f.linh_vuc.filter(x => x !== v) : [...f.linh_vuc, v]
  }));

  const handleSave = async () => {
    if (!form.ten_cong_ty.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        const updated = await updateNhaCungCap(editId, { ...form, updated_at: new Date().toISOString() });
        if (updated?.[0]) setItems(items.map(i => i.id === editId ? updated[0] : i));
        else await load();
      } else {
        await saveNhaCungCap(form);
        await load();
      }
      setShowForm(false); setEditId(null);
    } catch (e) { setError("Lỗi lưu: " + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try { await deleteNhaCungCap(id); setItems(items.filter(i => i.id !== id)); }
    catch (e) { setError(e.message); }
    finally { setDeletingId(null); }
  };

  const mauColor = (m) => m === "Cao" ? COLORS.danger : m === "Trung bình" ? COLORS.amber : COLORS.slateLight;
  const mauBg = (m) => m === "Cao" ? COLORS.dangerLight : m === "Trung bình" ? COLORS.amberLight : COLORS.surface;

  const filtered = items.filter(i => {
    const txt = `${i.ten_cong_ty} ${i.san_pham} ${i.nguoi_lien_he} ${(i.linh_vuc||[]).join(" ")} ${i.nguon} ${i.ghi_chu}`.toLowerCase();
    const matchSearch = !search || txt.includes(search.toLowerCase());
    const matchLinh = !filterLinh || (i.linh_vuc || []).includes(filterLinh);
    return matchSearch && matchLinh;
  });

  if (!supabaseConfigured) return (
    <div>
      <SectionTitle icon="🏭" title="Danh bạ Nhà cung cấp" sub="Quản lý thông tin đối tác cung cấp thiết bị, vật tư" />
      <Card style={{ background: COLORS.amberLight, border: `1px solid ${COLORS.amber}` }}>
        <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 8 }}>⚙️ Chưa kết nối Supabase</div>
        <p style={{ fontSize: 13, color: COLORS.slate, margin: 0 }}>Cần cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong Vercel, và chạy migration-004.sql để tạo bảng.</p>
      </Card>
    </div>
  );

  return (
    <div>
      <SectionTitle icon="🏭" title="Danh bạ Nhà cung cấp" sub="Quản lý thông tin đối tác cung cấp thiết bị, vật tư — van, bolt, PCCC, cảm biến..." />

      {/* Toolbar */}
      <Card>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Tìm tên công ty, sản phẩm, người liên hệ, lĩnh vực..."
            style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
          <select value={filterLinh} onChange={e => setFilterLinh(e.target.value)} style={{ ...inputStyle, width: 160 }}>
            <option value="">Tất cả lĩnh vực</option>
            {LINH_VUC_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
          <Btn onClick={load} variant="secondary" style={{ padding: "9px 14px", fontSize: 13 }}>🔄</Btn>
          <Btn onClick={openNew} variant="primary">+ Thêm nhà cung cấp</Btn>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: COLORS.slateLight }}>
          {filtered.length}/{items.length} nhà cung cấp
        </div>
      </Card>

      {error && <Card style={{ background: COLORS.dangerLight, border: `1px solid ${COLORS.danger}` }}>
        <span style={{ color: COLORS.danger }}>⚠️ {error}</span>
      </Card>}

      {/* Form thêm/sửa */}
      {showForm && (
        <Card style={{ borderLeft: `4px solid ${COLORS.teal}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 16, fontSize: 15 }}>
            {editId ? "✏️ Chỉnh sửa nhà cung cấp" : "➕ Thêm nhà cung cấp mới"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Tên công ty *</label>
              <input value={form.ten_cong_ty} onChange={e => setForm(f => ({...f, ten_cong_ty: e.target.value}))}
                placeholder="VD: HYUNWOO Industrial Co., LTD." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Sản phẩm chính</label>
              <input value={form.san_pham} onChange={e => setForm(f => ({...f, san_pham: e.target.value}))}
                placeholder="VD: Knife Gate Valves, HWCUPOLA" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Quốc gia</label>
              <input value={form.quoc_gia} onChange={e => setForm(f => ({...f, quoc_gia: e.target.value}))}
                placeholder="VD: Hàn Quốc, Việt Nam, Nhật Bản" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Website</label>
              <input value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))}
                placeholder="VD: www.hwvalve.net" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nguồn</label>
              <input value={form.nguon} onChange={e => setForm(f => ({...f, nguon: e.target.value}))}
                placeholder="VD: ENTECH Vietnam 2026, Giới thiệu" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mức độ quan tâm</label>
              <select value={form.muc_do_quan_tam} onChange={e => setForm(f => ({...f, muc_do_quan_tam: e.target.value}))} style={inputStyle}>
                {MUC_DO_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Lĩnh vực — multi-select tag */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Lĩnh vực cung cấp</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {LINH_VUC_OPTIONS.map(v => (
                <div key={v} onClick={() => toggleLinh(v)} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  fontWeight: form.linh_vuc.includes(v) ? 700 : 400,
                  background: form.linh_vuc.includes(v) ? COLORS.teal : COLORS.surface,
                  color: form.linh_vuc.includes(v) ? COLORS.white : COLORS.slate,
                  border: `1px solid ${form.linh_vuc.includes(v) ? COLORS.teal : COLORS.border}`,
                  transition: "all 0.15s",
                }}>{v}</div>
              ))}
            </div>
          </div>

          <PipelineRule />
          <div style={{ fontWeight: 600, color: COLORS.navy, marginBottom: 10, fontSize: 13 }}>Thông tin liên hệ</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Người liên hệ</label>
              <input value={form.nguoi_lien_he} onChange={e => setForm(f => ({...f, nguoi_lien_he: e.target.value}))}
                placeholder="VD: Mr. Kim, Ms. Nguyen" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Chức vụ</label>
              <input value={form.chuc_vu} onChange={e => setForm(f => ({...f, chuc_vu: e.target.value}))}
                placeholder="VD: Sales Manager" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Điện thoại</label>
              <input value={form.dien_thoai} onChange={e => setForm(f => ({...f, dien_thoai: e.target.value}))}
                placeholder="+82) 55 763 8183" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Email</label>
              <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                placeholder="sales@company.com" style={inputStyle} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: COLORS.slate }}>
                <input type="checkbox" checked={form.da_lien_he}
                  onChange={e => setForm(f => ({...f, da_lien_he: e.target.checked}))}
                  style={{ width: 16, height: 16, accentColor: COLORS.teal }} />
                Đã liên hệ
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Ghi chú / Đánh giá</label>
            <textarea value={form.ghi_chu} onChange={e => setForm(f => ({...f, ghi_chu: e.target.value}))}
              placeholder="VD: Gặp tại booth B12 ENTECH, quan tâm valve ash handling cho dự án Long Phú 1, cần xin catalogue..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={handleSave} disabled={saving || !form.ten_cong_ty.trim()} variant="primary">
              {saving ? <><Spinner />Đang lưu...</> : editId ? "💾 Cập nhật" : "💾 Lưu nhà cung cấp"}
            </Btn>
            <Btn onClick={() => { setShowForm(false); setEditId(null); }} variant="secondary">Huỷ</Btn>
          </div>
        </Card>
      )}

      {/* Danh sách */}
      {loading ? (
        <Card><div style={{ color: COLORS.slateLight }}><Spinner />Đang tải...</div></Card>
      ) : filtered.length === 0 ? (
        <Card><div style={{ color: COLORS.slateLight, textAlign: "center", padding: "24px 0" }}>
          {items.length === 0
            ? <>Chưa có nhà cung cấp nào. Bấm <strong>+ Thêm nhà cung cấp</strong> để bắt đầu nhập contact từ sự kiện ENTECH.</>
            : "Không tìm thấy nhà cung cấp phù hợp."}
        </div></Card>
      ) : (
        filtered.map(item => (
          <Card key={item.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: COLORS.navy, fontSize: 15 }}>{item.ten_cong_ty}</span>
                  {item.quoc_gia && <Badge color={COLORS.slateLight} bg={COLORS.surface}>{item.quoc_gia}</Badge>}
                  {item.muc_do_quan_tam && <Badge color={mauColor(item.muc_do_quan_tam)} bg={mauBg(item.muc_do_quan_tam)}>{item.muc_do_quan_tam}</Badge>}
                  {item.da_lien_he && <Badge color={COLORS.success} bg={COLORS.successLight}>✓ Đã liên hệ</Badge>}
                </div>
                {item.san_pham && <div style={{ fontSize: 13, color: COLORS.slate, marginBottom: 6 }}>{item.san_pham}</div>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(item.linh_vuc || []).map(v => <Badge key={v}>{v}</Badge>)}
                  {item.nguon && <span style={{ fontSize: 11, color: COLORS.slateLight }}>· {item.nguon}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                <Btn onClick={e => { e.stopPropagation(); openEdit(item); }} variant="secondary" style={{ padding: "5px 10px", fontSize: 12 }}>✏️</Btn>
                <Btn onClick={e => { e.stopPropagation(); handleDelete(item.id); }} disabled={deletingId === item.id} variant="secondary" style={{ padding: "5px 10px", fontSize: 12 }}>
                  {deletingId === item.id ? "..." : "🗑️"}
                </Btn>
                <span style={{ color: COLORS.slateLight, padding: "5px 4px" }}>{expanded === item.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {expanded === item.id && (
              <div>
                <PipelineRule />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 8, fontSize: 12, textTransform: "uppercase" }}>📞 Liên hệ</div>
                    {item.nguoi_lien_he && <div style={{ marginBottom: 4 }}><strong>{item.nguoi_lien_he}</strong>{item.chuc_vu && ` — ${item.chuc_vu}`}</div>}
                    {item.dien_thoai && <div style={{ color: COLORS.slate, marginBottom: 2 }}>📱 {item.dien_thoai}</div>}
                    {item.email && <div style={{ color: COLORS.teal, marginBottom: 2 }}>✉️ {item.email}</div>}
                    {item.website && <div style={{ color: COLORS.teal }}>🌐 {item.website}</div>}
                  </div>
                  <div>
                    {item.ghi_chu && (
                      <>
                        <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 8, fontSize: 12, textTransform: "uppercase" }}>📝 Ghi chú</div>
                        <div style={{ color: COLORS.slate, lineHeight: 1.6 }}>{item.ghi_chu}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Shared input styles ──────────────────────────────────────────────────────

// ─── Module 5: Kho Gói thầu (Archive) ────────────────────────────────────────

function ArchiveModule() {
  const [subTab, setSubTab] = useState("goi_thau"); // "goi_thau" | "so_sanh"
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [compareError, setCompareError] = useState(null);
  const [compareRaw, setCompareRaw] = useState(null);

  const [soSanhItems, setSoSanhItems] = useState([]);
  const [soSanhLoading, setSoSanhLoading] = useState(true);
  const [soSanhError, setSoSanhError] = useState(null);
  const [soSanhExpanded, setSoSanhExpanded] = useState(null);
  const [soSanhDeletingId, setSoSanhDeletingId] = useState(null);

  const loadSoSanh = useCallback(async () => {
    setSoSanhLoading(true); setSoSanhError(null);
    try {
      const data = await listSoSanh();
      setSoSanhItems(data || []);
    } catch (e) {
      setSoSanhError(e.message);
    } finally {
      setSoSanhLoading(false);
    }
  }, []);

  useState(() => { loadSoSanh(); });

  const handleDeleteSoSanh = async (id) => {
    setSoSanhDeletingId(id);
    try {
      await deleteSoSanh(id);
      setSoSanhItems(soSanhItems.filter(i => i.id !== id));
    } catch (e) {
      setSoSanhError(e.message);
    } finally {
      setSoSanhDeletingId(null);
    }
  };

  const muc_do_color2 = (m) => m === "Cao" ? COLORS.danger : m === "Trung bình" ? COLORS.amber : COLORS.slateLight;
  const muc_do_bg2 = (m) => m === "Cao" ? COLORS.dangerLight : m === "Trung bình" ? COLORS.amberLight : COLORS.surface;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await listGoiThau();
      setItems(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải danh sách khi mở tab
  useState(() => { load(); });

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteGoiThau(id);
      setItems(items.filter(i => i.id !== id));
      setSelectedIds(selectedIds.filter(s => s !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelect = (id) => {
    setCompareResult(null); setCompareError(null);
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      if (prev.length >= 2) return [prev[1], id]; // giữ tối đa 2, đẩy cái cũ nhất ra
      return [...prev, id];
    });
  };

  const quickCompare = async () => {
    if (selectedIds.length !== 2) return;
    setComparing(true); setCompareError(null); setCompareResult(null); setCompareRaw(null);
    try {
      const itemA = items.find(i => i.id === selectedIds[0]);
      const itemB = items.find(i => i.id === selectedIds[1]);

      // So sánh dựa trên JSON tóm tắt đã lưu — KHÔNG gửi lại file PDF gốc,
      // nên rẻ hơn nhiều lần so với module So sánh Phiên bản (chỉ gửi text, không gửi ảnh trang PDF)
      const systemPrompt = `Bạn là chuyên gia phân tích hồ sơ mời thầu (HSMT) cho công ty xây lắp dầu khí PETROCONs.
Bạn nhận 2 bản tóm tắt JSON (đã được trích xuất trước đó từ 2 phiên bản HSMT của cùng 1 gói thầu).
So sánh 2 bản tóm tắt này, tìm điểm khác biệt. Lưu ý: đây là so sánh dựa trên tóm tắt, không phải toàn văn — có thể không bắt được thay đổi nhỏ không nằm trong tóm tắt.
Trả lời bằng tiếng Việt, súc tích. Trả về JSON theo cấu trúc:
{
  "tom_tat_thay_doi": "Tóm tắt ngắn 1-2 câu",
  "thay_doi_phat_hien": [
    {"muc": "Tên mục", "ban_cu": "...", "ban_moi": "...", "muc_do": "Cao hoặc Trung bình hoặc Thấp"}
  ],
  "luu_y": "Nhắc nhở ngắn nếu cần so sánh sâu hơn bằng cách upload lại 2 file PDF gốc"
}
QUAN TRỌNG:
- Đây phải là JSON hợp lệ 100%. Nếu nội dung cần trích có chứa dấu ngoặc kép ("), PHẢI escape thành \\" hoặc diễn đạt lại không dùng dấu ngoặc kép.
- Mỗi trường "ban_cu"/"ban_moi": tối đa 1-2 câu ngắn, không trích dẫn nguyên văn dài.
- KHÔNG đưa ra số trang trong kết quả này — bạn chỉ nhận được bản tóm tắt văn bản, không có quyền truy cập file PDF gốc, nên không thể xác định số trang chính xác. Nếu cần biết số trang, người dùng nên dùng module "So sánh Phiên bản" (upload trực tiếp 2 file PDF).
- Tối đa 10 mục trong "thay_doi_phat_hien", chọn những thay đổi quan trọng nhất.`;

      const prompt = `BẢN A (lưu ngày ${itemA.created_at ? new Date(itemA.created_at).toLocaleDateString("vi-VN") : "?"}):
${JSON.stringify({
  ten_goi_thau: itemA.ten_goi_thau, chu_dau_tu: itemA.chu_dau_tu, gia_tri_uoc_tinh: itemA.gia_tri_uoc_tinh,
  han_nop: itemA.han_nop, yeu_cau_chinh: itemA.yeu_cau_chinh, dieu_kien_tham_du: itemA.dieu_kien_tham_du,
  rui_ro_can_luu_y: itemA.rui_ro_can_luu_y, tieu_chi_danh_gia: itemA.tieu_chi_danh_gia,
  doi_tac_nha_thau_phu: itemA.doi_tac_nha_thau_phu, xac_nhan_chu_dau_tu: itemA.xac_nhan_chu_dau_tu,
})}

BẢN B (lưu ngày ${itemB.created_at ? new Date(itemB.created_at).toLocaleDateString("vi-VN") : "?"}):
${JSON.stringify({
  ten_goi_thau: itemB.ten_goi_thau, chu_dau_tu: itemB.chu_dau_tu, gia_tri_uoc_tinh: itemB.gia_tri_uoc_tinh,
  han_nop: itemB.han_nop, yeu_cau_chinh: itemB.yeu_cau_chinh, dieu_kien_tham_du: itemB.dieu_kien_tham_du,
  rui_ro_can_luu_y: itemB.rui_ro_can_luu_y, tieu_chi_danh_gia: itemB.tieu_chi_danh_gia,
  doi_tac_nha_thau_phu: itemB.doi_tac_nha_thau_phu, xac_nhan_chu_dau_tu: itemB.xac_nhan_chu_dau_tu,
})}

So sánh 2 bản trên theo đúng cấu trúc JSON yêu cầu.`;

      const raw = await callClaude(systemPrompt, prompt, false, 4096);
      const clean = raw.replace(/```json|```/g, "").trim();
      try {
        setCompareResult(JSON.parse(clean));
      } catch (parseErr) {
        setCompareRaw(clean);
        setCompareError("Không đọc được kết quả dạng có cấu trúc. Nội dung thô AI trả về vẫn hiển thị phía dưới.");
      }
    } catch (e) {
      setCompareError("Lỗi so sánh nhanh: " + e.message);
    } finally {
      setComparing(false);
    }
  };

  const muc_do_color = (m) => m === "Cao" ? COLORS.danger : m === "Trung bình" ? COLORS.amber : COLORS.slateLight;
  const muc_do_bg = (m) => m === "Cao" ? COLORS.dangerLight : m === "Trung bình" ? COLORS.amberLight : COLORS.surface;

  // Helper: trích xuất toàn bộ text từ 1 item để search full-text
  const extractAllText = (item) => {
    const parts = [
      item.ten_goi_thau || "",
      item.chu_dau_tu || "",
      item.ten_file || "",
      item.gia_tri_uoc_tinh || "",
      item.han_nop || "",
      // Flatten các mảng string đơn giản
      ...(item.yeu_cau_chinh || []),
      ...(item.dieu_kien_tham_du || []),
      ...(item.rui_ro_can_luu_y || []),
      ...(item.tieu_chi_danh_gia || []),
      // Flatten các mảng object (doi_tac, xac_nhan)
      ...(item.doi_tac_nha_thau_phu || []).map(d => `${d.noi_dung || ""} ${d.muc_do || ""}`),
      ...(item.xac_nhan_chu_dau_tu || []).map(d => `${d.loai || ""} ${d.noi_dung || ""}`),
      // Tên tổ chức cụ thể — quan trọng nhất cho search theo tên riêng
      ...(item.to_chuc_lien_quan || []).map(d => `${d.ten || ""} ${d.vai_tro || ""}`),
    ];
    return parts.join(" ").toLowerCase();
  };

  // Helper: tìm đoạn text chứa keyword để hiển thị context
  const findMatchContext = (item, keyword) => {
    if (!keyword) return null;
    const kw = keyword.toLowerCase();
    const matches = [];

    const checkField = (label, text) => {
      if (text && text.toLowerCase().includes(kw)) {
        const idx = text.toLowerCase().indexOf(kw);
        const start = Math.max(0, idx - 30);
        const end = Math.min(text.length, idx + keyword.length + 50);
        const snippet = (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
        matches.push({ label, snippet });
      }
    };

    checkField("Tên gói thầu", item.ten_goi_thau);
    checkField("Chủ đầu tư", item.chu_dau_tu);
    (item.yeu_cau_chinh || []).forEach(t => checkField("Yêu cầu chính", t));
    (item.dieu_kien_tham_du || []).forEach(t => checkField("Điều kiện tham dự", t));
    (item.rui_ro_can_luu_y || []).forEach(t => checkField("Rủi ro", t));
    (item.tieu_chi_danh_gia || []).forEach(t => checkField("Tiêu chí đánh giá", t));
    (item.doi_tac_nha_thau_phu || []).forEach(d => checkField("🤝 Đối tác/Nhà thầu phụ", d.noi_dung));
    (item.xac_nhan_chu_dau_tu || []).forEach(d => checkField(`✍️ Xác nhận CĐT (${d.loai})`, d.noi_dung));
    (item.to_chuc_lien_quan || []).forEach(d => checkField(`🏢 Tổ chức: ${d.vai_tro || ""}`, d.ten));

    return matches.slice(0, 3); // tối đa 3 đoạn context để không làm UI quá dài
  };

  const filtered = search.trim()
    ? items.filter(i => extractAllText(i).includes(search.toLowerCase()))
    : items;

  if (!supabaseConfigured) {
    return (
      <div>
        <SectionTitle icon="🗄️" title="Kho Gói thầu" sub="Tra cứu lại các gói thầu đã phân tích trước đây" />
        <Card style={{ background: COLORS.amberLight, border: `1px solid ${COLORS.amber}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 8 }}>⚙️ Chưa kết nối Supabase</div>
          <p style={{ fontSize: 13, color: COLORS.slate, margin: 0, lineHeight: 1.7 }}>
            Để lưu trữ và tra cứu lại các gói thầu đã phân tích, cần kết nối database Supabase.
            Thêm 2 biến môi trường <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code> vào Vercel
            (xem hướng dẫn kết nối Supabase đi kèm), sau đó redeploy lại.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle icon="🗄️" title="Kho Gói thầu" sub="Tra cứu lại các gói thầu đã phân tích trước đây — dữ liệu lưu trên Supabase" />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${COLORS.border}` }}>
        <button
          onClick={() => setSubTab("goi_thau")}
          style={{
            padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: subTab === "goi_thau" ? 700 : 400,
            color: subTab === "goi_thau" ? COLORS.teal : COLORS.slateLight,
            borderBottom: subTab === "goi_thau" ? `2px solid ${COLORS.teal}` : "2px solid transparent",
          }}
        >
          📋 Gói thầu đã phân tích ({items.length})
        </button>
        <button
          onClick={() => setSubTab("so_sanh")}
          style={{
            padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: subTab === "so_sanh" ? 700 : 400,
            color: subTab === "so_sanh" ? COLORS.teal : COLORS.slateLight,
            borderBottom: subTab === "so_sanh" ? `2px solid ${COLORS.teal}` : "2px solid transparent",
          }}
        >
          🔍 So sánh Phiên bản đã lưu ({soSanhItems.length})
        </button>
      </div>

      {subTab === "so_sanh" ? (
        <div>
          <Card>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn onClick={loadSoSanh} variant="secondary" style={{ padding: "9px 16px", fontSize: 13 }}>🔄 Tải lại</Btn>
            </div>
          </Card>

          {soSanhError && (
            <Card style={{ background: COLORS.dangerLight, border: `1px solid ${COLORS.danger}` }}>
              <span style={{ color: COLORS.danger }}>⚠️ {soSanhError}</span>
            </Card>
          )}

          {soSanhLoading ? (
            <Card><div style={{ color: COLORS.slateLight }}><Spinner />Đang tải...</div></Card>
          ) : soSanhItems.length === 0 ? (
            <Card><div style={{ color: COLORS.slateLight, textAlign: "center", padding: "20px 0" }}>
              Chưa có bản so sánh nào được lưu. Dùng module "So sánh Phiên bản" rồi bấm "Lưu vào Kho" để bắt đầu.
            </div></Card>
          ) : (
            soSanhItems.map(item => (
              <Card key={item.id} style={{ marginBottom: 12 }}>
                <div
                  onClick={() => setSoSanhExpanded(soSanhExpanded === item.id ? null : item.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 14, marginBottom: 4 }}>
                      {item.ten_file_cu} → {item.ten_file_moi}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.slateLight }}>
                      Lưu ngày {item.created_at ? new Date(item.created_at).toLocaleDateString("vi-VN") : "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Btn
                      onClick={(e) => { e.stopPropagation(); handleDeleteSoSanh(item.id); }}
                      disabled={soSanhDeletingId === item.id}
                      variant="secondary"
                      style={{ padding: "5px 12px", fontSize: 12 }}
                    >
                      {soSanhDeletingId === item.id ? "..." : "🗑️ Xoá"}
                    </Btn>
                    <span style={{ color: COLORS.slateLight }}>{soSanhExpanded === item.id ? "▲" : "▼"}</span>
                  </div>
                </div>

                {soSanhExpanded === item.id && (
                  <div>
                    <PipelineRule />
                    <p style={{ fontSize: 13, color: COLORS.slate, marginBottom: 14 }}>{item.tom_tat_thay_doi}</p>

                    {(item.thay_doi_quan_trong || []).map((t, i) => (
                      <div key={i} style={{
                        border: `1px solid ${COLORS.border}`,
                        borderLeft: `4px solid ${muc_do_color2(t.muc_do)}`,
                        borderRadius: 6, padding: 12, marginBottom: 10,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <strong style={{ fontSize: 13, color: COLORS.navy }}>{t.muc}</strong>
                          <Badge color={muc_do_color2(t.muc_do)} bg={muc_do_bg2(t.muc_do)}>{t.muc_do}</Badge>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div>
                            {t.trang_cu && <div style={{ fontSize: 10, color: COLORS.teal, fontWeight: 700, marginBottom: 3 }}>📄 Trang {t.trang_cu}</div>}
                            <div style={{ fontSize: 12, color: COLORS.slate, background: COLORS.dangerLight, padding: 8, borderRadius: 4 }}>{t.ban_cu}</div>
                          </div>
                          <div>
                            {t.trang_moi && <div style={{ fontSize: 10, color: COLORS.teal, fontWeight: 700, marginBottom: 3 }}>📄 Trang {t.trang_moi}</div>}
                            <div style={{ fontSize: 12, color: COLORS.slate, background: COLORS.successLight, padding: 8, borderRadius: 4 }}>{t.ban_moi}</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(item.khuyen_nghi_hanh_dong || []).length > 0 && (
                      <div style={{ background: COLORS.amberLight, borderRadius: 8, padding: 12, marginTop: 10 }}>
                        <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 8, fontSize: 13 }}>✅ Việc cần làm ngay</div>
                        {item.khuyen_nghi_hanh_dong.map((r, i) => (
                          <div key={i} style={{ fontSize: 12, color: COLORS.slate, marginBottom: 4 }}>{i + 1}. {r}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      ) : (
      <div>

      <Card>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Tìm toàn văn: tên gói, chủ đầu tư, nhà thầu phụ, yêu cầu kỹ thuật, điều kiện tham dự..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <Btn onClick={load} variant="secondary" style={{ padding: "9px 16px", fontSize: 13 }}>🔄 Tải lại</Btn>
        </div>
      </Card>

      {selectedIds.length > 0 && (
        <Card style={{ background: COLORS.tealLight, border: `1px solid ${COLORS.teal}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, color: COLORS.navy }}>
              Đã chọn <strong>{selectedIds.length}/2</strong> gói thầu để so sánh
              {selectedIds.length === 2 && <span style={{ color: COLORS.slateLight }}> · So sánh nhanh dùng bản tóm tắt đã lưu, rẻ hơn nhiều so với upload lại PDF gốc — không hiển thị số trang vì không đọc trực tiếp file PDF</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setSelectedIds([])} variant="secondary" style={{ padding: "6px 14px", fontSize: 13 }}>Bỏ chọn</Btn>
              <Btn onClick={quickCompare} disabled={selectedIds.length !== 2 || comparing} variant="amber" style={{ padding: "6px 14px", fontSize: 13 }}>
                {comparing ? <><Spinner />Đang so sánh...</> : "⚡ So sánh nhanh"}
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {compareError && (
        <Card style={{ background: COLORS.dangerLight, border: `1px solid ${COLORS.danger}` }}>
          <span style={{ color: COLORS.danger }}>⚠️ {compareError}</span>
        </Card>
      )}

      {compareRaw && (
        <Card style={{ background: COLORS.amberLight, border: `1px solid ${COLORS.amber}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 10 }}>📄 Nội dung thô từ AI (chưa định dạng được)</div>
          <div style={{
            whiteSpace: "pre-wrap", fontSize: 12, color: COLORS.slate, fontFamily: "monospace",
            background: COLORS.white, padding: 12, borderRadius: 6, maxHeight: 400, overflow: "auto",
          }}>
            {compareRaw}
          </div>
        </Card>
      )}

      {compareResult && (
        <Card style={{ borderLeft: `4px solid ${COLORS.teal}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 6 }}>⚡ Kết quả So sánh nhanh</div>
          <p style={{ fontSize: 13, color: COLORS.slate, marginBottom: 16 }}>{compareResult.tom_tat_thay_doi}</p>

          {(compareResult.thay_doi_phat_hien || []).map((t, i) => (
            <div key={i} style={{
              border: `1px solid ${COLORS.border}`,
              borderLeft: `4px solid ${muc_do_color(t.muc_do)}`,
              borderRadius: 6,
              padding: 12,
              marginBottom: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <strong style={{ fontSize: 13, color: COLORS.navy }}>{t.muc}</strong>
                <Badge color={muc_do_color(t.muc_do)} bg={muc_do_bg(t.muc_do)}>{t.muc_do}</Badge>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ fontSize: 12, color: COLORS.slate, background: COLORS.dangerLight, padding: 8, borderRadius: 4 }}>{t.ban_cu}</div>
                <div style={{ fontSize: 12, color: COLORS.slate, background: COLORS.successLight, padding: 8, borderRadius: 4 }}>{t.ban_moi}</div>
              </div>
            </div>
          ))}

          {compareResult.luu_y && (
            <div style={{ fontSize: 12, color: COLORS.slateLight, marginTop: 12, fontStyle: "italic" }}>
              💡 {compareResult.luu_y}
            </div>
          )}
        </Card>
      )}

      {error && (
        <Card style={{ background: COLORS.dangerLight, border: `1px solid ${COLORS.danger}` }}>
          <span style={{ color: COLORS.danger }}>⚠️ {error}</span>
        </Card>
      )}

      {loading ? (
        <Card><div style={{ color: COLORS.slateLight }}><Spinner />Đang tải kho lưu trữ...</div></Card>
      ) : filtered.length === 0 ? (
        <Card><div style={{ color: COLORS.slateLight, textAlign: "center", padding: "20px 0" }}>
          {items.length === 0 ? "Chưa có gói thầu nào được lưu. Phân tích HSMT rồi bấm \"Lưu vào Kho\" để bắt đầu." : "Không tìm thấy kết quả phù hợp."}
        </div></Card>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: COLORS.slateLight, marginBottom: 10 }}>{filtered.length} gói thầu đã lưu</div>
          {filtered.map(item => (
            <Card key={item.id} style={{ marginBottom: 12, border: selectedIds.includes(item.id) ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}` }}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, cursor: "pointer" }} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: 4, width: 16, height: 16, cursor: "pointer", accentColor: COLORS.teal }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 15, marginBottom: 4 }}>
                      {item.ten_goi_thau || item.ten_file || "Gói thầu chưa đặt tên"}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.slateLight }}>
                      {item.chu_dau_tu && <span>{item.chu_dau_tu} · </span>}
                      {item.gia_tri_uoc_tinh && <span>{item.gia_tri_uoc_tinh} · </span>}
                      Lưu ngày {item.created_at ? new Date(item.created_at).toLocaleDateString("vi-VN") : "—"}
                    </div>
                    {search.trim() && (() => {
                      const matches = findMatchContext(item, search.trim());
                      if (!matches || matches.length === 0) return null;
                      return (
                        <div style={{ marginTop: 8 }}>
                          {matches.map((m, mi) => (
                            <div key={mi} style={{
                              fontSize: 11,
                              background: COLORS.amberLight,
                              border: `1px solid ${COLORS.amber}`,
                              borderRadius: 4,
                              padding: "4px 8px",
                              marginBottom: 4,
                            }}>
                              <span style={{ fontWeight: 700, color: COLORS.amber }}>
                                📍 {m.label}:
                              </span>
                              {" "}
                              <span style={{ color: COLORS.slate }}>{m.snippet}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Btn
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    disabled={deletingId === item.id}
                    variant="secondary"
                    style={{ padding: "5px 12px", fontSize: 12 }}
                  >
                    {deletingId === item.id ? "..." : "🗑️ Xoá"}
                  </Btn>
                  <span style={{ color: COLORS.slateLight }}>{expanded === item.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {expanded === item.id && (
                <div>
                  <PipelineRule />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: COLORS.slateLight, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>Hạn nộp</div>
                      <div style={{ fontSize: 14, color: COLORS.navy, marginBottom: 14 }}>{item.han_nop || "—"}</div>

                      <div style={{ fontSize: 11, color: COLORS.slateLight, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>Yêu cầu chính</div>
                      {(item.yeu_cau_chinh || []).map((r, i) => (
                        <div key={i} style={{ fontSize: 13, color: COLORS.slate, marginBottom: 4 }}>▸ {r}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: COLORS.slateLight, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>Rủi ro cần lưu ý</div>
                      {(item.rui_ro_can_luu_y || []).map((r, i) => (
                        <div key={i} style={{ fontSize: 13, color: COLORS.slate, marginBottom: 4 }}>! {r}</div>
                      ))}

                      <div style={{ fontSize: 11, color: COLORS.slateLight, textTransform: "uppercase", marginBottom: 6, marginTop: 14, fontWeight: 700 }}>Điều kiện tham dự</div>
                      {(item.dieu_kien_tham_du || []).map((r, i) => (
                        <div key={i} style={{ fontSize: 13, color: COLORS.slate, marginBottom: 4 }}>✓ {r}</div>
                      ))}
                    </div>
                  </div>

                  {((item.doi_tac_nha_thau_phu || []).length > 0 || (item.xac_nhan_chu_dau_tu || []).length > 0) && (
                    <div style={{ background: COLORS.amberLight, borderRadius: 8, padding: 14, marginTop: 14 }}>
                      <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 10, fontSize: 13 }}>🔑 Đối tác & Xác nhận Chủ đầu tư</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div>
                          {(item.doi_tac_nha_thau_phu || []).map((d, i) => (
                            <div key={i} style={{ fontSize: 12, color: COLORS.slate, marginBottom: 6 }}>🤝 {d.noi_dung}</div>
                          ))}
                        </div>
                        <div>
                          {(item.xac_nhan_chu_dau_tu || []).map((d, i) => (
                            <div key={i} style={{ fontSize: 12, color: COLORS.slate, marginBottom: 6 }}><strong>{d.loai}:</strong> {d.noi_dung}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: COLORS.slateLight,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  fontSize: 14,
  color: COLORS.navy,
  background: COLORS.white,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

// ─── App shell ───────────────────────────────────────────────────────────────

export default function App() {
  const [active, setActive] = useState("analyze");

  return (
    <div style={{ minHeight: "100vh", background: COLORS.surface, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color: ${COLORS.teal} !important; box-shadow: 0 0 0 3px ${COLORS.tealLight}; }
        @media (max-width: 600px) {
          .grid-2col { grid-template-columns: 1fr !important; }
          .grid-3col { grid-template-columns: 1fr !important; }
          .hide-mobile { display: none !important; }
          div[style*="gridTemplateColumns"][style*="1fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="gridTemplateColumns"][style*="repeat(3"] { grid-template-columns: 1fr !important; }
          div[style*="gridTemplateColumns"][style*="repeat(2"] { grid-template-columns: 1fr !important; }
          div[style*="gridTemplateColumns"][style*="1fr 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: COLORS.navy, padding: "0 16px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: COLORS.teal,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: COLORS.white,
            }}>P</div>
            <div>
              <div style={{ color: COLORS.white, fontWeight: 700, fontSize: 15, lineHeight: 1 }}>PETROCONs</div>
              <div style={{ color: COLORS.amber, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>AI Đấu thầu</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Nội bộ · Thương mại Đấu thầu</div>
        </div>
      </div>

      {/* Pipeline accent */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.amber}, ${COLORS.teal})` }} />

      {/* Nav tabs — responsive */}
      <div style={{ background: COLORS.white, borderBottom: `1px solid ${COLORS.border}` }}>
        <style>{`
          .nav-tabs-wrap {
            max-width: 1100px;
            margin: 0 auto;
            display: flex;
            flex-wrap: wrap;
            padding: 0 16px;
          }
          .nav-tab-btn {
            padding: 12px 14px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
            flex-shrink: 0;
          }
          @media (min-width: 640px) {
            .nav-tabs-wrap { padding: 0 32px; }
            .nav-tab-btn { padding: 14px 16px; font-size: 13px; }
          }
          @media (max-width: 480px) {
            .nav-tab-btn { padding: 10px 10px; font-size: 11px; }
            .nav-tab-label { display: none; }
            .nav-tab-btn.active .nav-tab-label { display: inline; }
          }
        `}</style>
        <div className="nav-tabs-wrap">
          {MODULES.map(m => (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className={`nav-tab-btn${active === m.id ? " active" : ""}`}
              style={{
                borderBottom: active === m.id ? `3px solid ${COLORS.teal}` : "3px solid transparent",
                fontWeight: active === m.id ? 700 : 400,
                color: active === m.id ? COLORS.teal : COLORS.slateLight,
              }}
            >
              <span>{m.icon}</span>
              <span className="nav-tab-label">{m.short}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
        {active === "analyze" && <AnalyzeModule />}
        {active === "compare" && <CompareModule />}
        {active === "draft"   && <DraftModule />}
        {active === "price"   && <PriceModule />}
        {active === "db"      && <SupplierModule />}
        {active === "archive" && <ArchiveModule />}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "16px 32px", textAlign: "center" }}>
        <span style={{ fontSize: 11, color: COLORS.slateLight }}>
          PETROCONs AI Đấu thầu · Prototype v0.1 · Powered by Claude AI · Chỉ dùng nội bộ
        </span>
      </div>
    </div>
  );
}
