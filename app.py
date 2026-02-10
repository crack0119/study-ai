import streamlit as st
import google.generativeai as genai
from PIL import Image
import io

# 1. 디자인: 애플 감성 다크 모드
st.set_page_config(page_title="Doctor AI Pro", layout="wide")
st.markdown("""
<style>
    .stApp { background-color: #0E1117; color: white; }
    .stButton > button {
        background: linear-gradient(90deg, #FF4B4B, #FF914D);
        color: white; border-radius: 12px; font-weight: bold; width: 100%; padding: 1rem;
    }
    .result-box { background-color: #1E1E1E; padding: 20px; border-radius: 15px; border: 1px solid #333; }
</style>
""", unsafe_allow_html=True)

# 2. 시스템 진단 (사장님을 위한 진단기)
with st.sidebar:
    st.title("⚙️ System Status")
    api_key = st.secrets.get("GOOGLE_API_KEY")
    if api_key:
        st.success("✅ API Key Linked")
    else:
        st.error("🚨 API Key Missing (Secrets 설정 확인!)")
    st.caption("v2.6.0 - Stability First")

st.markdown("<h1 style='text-align: center;'>⚡ Doctor AI : Zero Defect</h1>", unsafe_allow_html=True)

# 3. 사진 업로드 (사장님의 의심 포인트 해결)
uploaded_file = st.file_uploader("📸 사진을 올려주세요 (자동 최적화)", type=["jpg", "jpeg", "png"])

if uploaded_file and st.button("🚀 즉시 분석 시작"):
    if not api_key:
        st.error("설정(Secrets)에서 API 키를 먼저 등록하세요."); st.stop()
    
    try:
        genai.configure(api_key=api_key)
        # 가장 안정적인 Flash 엔진 고정
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        with st.spinner("🧠 AI가 사진을 정밀 분석 중입니다..."):
            # [최적화] 사진을 AI 규격에 맞게 리사이징 (사장님 의심 해결)
            img = Image.open(uploaded_file)
            if max(img.size) > 1024:
                img.thumbnail((1024, 1024))
            
            # [타격] 프롬프트 실행
            prompt = "너는 1타 강사야. 이 사진을 보고 1.핵심요약 3줄, 2.중요단어 5개, 3.예상문제 3개를 한국어로 털어줘."
            response = model.generate_content([prompt, img])
            
            # [결과]
            st.balloons()
            st.markdown(f'<div class="result-box"><h3>📝 분석 리포트</h3>{response.text}</div>', unsafe_allow_html=True)
            
    except Exception as e:
        # 핑계 대지 않고 진짜 에러 노출
        st.error(f"🚨 시스템 충돌 발생: {str(e)}")
        st.info("Tip: API 키가 유효한지, 혹은 파일이 손상되었는지 확인하세요.")
