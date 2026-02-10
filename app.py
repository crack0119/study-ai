import streamlit as st
import google.generativeai as genai
from PIL import Image
import PyPDF2
import io

# 1. 디자인 (사장님 픽: 다크 네온)
st.set_page_config(page_title="닥터 AI", page_icon="🔥", layout="wide")

st.markdown("""
<style>
    .stApp { background-color: #0E1117; color: #E0E0E0; }
    .stFileUploader { background-color: #1E1E1E; border: 2px dashed #FF3131; border-radius: 15px; }
    .stButton > button {
        background: linear-gradient(135deg, #FF3131, #FF914D);
        color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 1.2rem;
        width: 100%; padding: 1rem; box-shadow: 0 4px 15px rgba(255, 49, 49, 0.3);
    }
    .result-card { background-color: #262730; padding: 25px; border-radius: 15px; border-left: 5px solid #FF3131; margin-bottom: 20px; }
</style>
""", unsafe_allow_html=True)

# 2. 엔진
def get_pdf_content(file):
    try:
        reader = PyPDF2.PdfReader(file)
        text = ""
        limit = min(len(reader.pages), 15)
        for i in range(limit):
            page_text = reader.pages[i].extract_text()
            if page_text: text += page_text
        return text if text.strip() else "IMAGE_PDF"
    except:
        return "ERROR"

# 3. 메인 UI
with st.sidebar:
    st.title("⚙️ System")
    if "GOOGLE_API_KEY" in st.secrets:
        api_key = st.secrets["GOOGLE_API_KEY"]
        st.success("✅ 연결 완료")
    else:
        api_key = st.text_input("🔑 API Key 입력", type="password")

st.markdown("<h1 style='text-align: center;'>🔥 닥터 AI : 무조건 분석한다</h1>", unsafe_allow_html=True)

uploaded_file = st.file_uploader("📸 분석할 사진이나 PDF를 올려", type=["jpg", "png", "jpeg", "pdf"])

if uploaded_file:
    if st.button("🚀 바로 분석 때리기", use_container_width=True):
        if not api_key:
            st.error("API 키부터 넣어줘.")
            st.stop()

        genai.configure(api_key=api_key)
        # [수정] 모델 이름을 가장 확실한 것으로 변경
        model = genai.GenerativeModel('gemini-1.5-flash')

        with st.spinner("🧠 분석 중..."):
            try:
                if "image" in uploaded_file.type:
                    img = Image.open(uploaded_file)
                    prompt = "너는 실전 멘토야. 이 사진 보고 1.핵심요약 3줄, 2.암기단어 5개, 3.예상문제 3개 딱딱 정리해. 말투는 시원시원하게."
                    res = model.generate_content([prompt, img])
                else:
                    pdf_text = get_pdf_content(uploaded_file)
                    prompt = f"아래 내용 분석해서 1.요약 2.단어 3.문제 순으로 털어줘.\n\n{pdf_text[:30000]}"
                    res = model.generate_content(prompt)

                st.balloons()
                st.markdown(f'<div class="result-card"><h3>📝 분석 결과</h3>{res.text}</div>', unsafe_allow_html=True)

            except Exception as e:
                # 불필요한 핑계 싹 지우고 진짜 에러만 표시
                st.error(f"분석 실패: {e}")
