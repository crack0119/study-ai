import streamlit as st
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import yt_dlp
import os
import time
import re

# 1. 페이지 설정
st.set_page_config(page_title="닥터 AI - 무적의 공부봇", page_icon="🎧", layout="wide")

# 2. 임시 파일 청소 함수 (용량 확보)
def cleanup_files():
    for file in os.listdir():
        if file.endswith(".mp3") or file.endswith(".webm") or file.endswith(".m4a"):
            try:
                os.remove(file)
            except:
                pass

# 3. 비디오 ID 추출
def extract_video_id(url):
    patterns = [r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',
                r'(?:shorts\/)([0-9A-Za-z_-]{11})', r'^([0-9A-Za-z_-]{11})$']
    for pattern in patterns:
        match = re.search(pattern, url)
        if match: return match.group(1)
    return None

# 4. 자막 가져오기 시도 (1차 시도)
def get_transcript_text(video_id):
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en', 'en-US', 'ja'])
        formatter = TextFormatter()
        return formatter.format_transcript(transcript)
    except:
        return None

# 5. 오디오 다운로드 (2차 시도 - 자막 없을 때)
def download_audio(url):
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{'key': 'FFmpegExtractAudio','preferredcodec': 'mp3','preferredquality': '192'}],
        'outtmpl': 'audio_sample.%(ext)s',
        'quiet': True
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    return "audio_sample.mp3"

# --- UI 시작 ---
with st.sidebar:
    st.header("⚙️ 설정")
    if "GOOGLE_API_KEY" in st.secrets:
        api_key = st.secrets["GOOGLE_API_KEY"]
        st.success("✅ API 키 연동됨")
    else:
        api_key = st.text_input("🔑 구글 API 키", type="password")
    
    st.info("💡 **새로운 기능**")
    st.caption("자막이 없으면 자동으로 소리를 듣고 분석합니다. (시간이 조금 더 걸려요!)")
    st.write("Developed by **Future Musk**")

st.title("🎧 닥터 AI : 자막 없어도 다 듣습니다")
st.markdown("#### 링크만 넣으세요. 자막이 없으면 직접 듣고 요약해 드립니다.")

video_url = st.text_input("👇 유튜브 링크 (Ctrl+V)", placeholder="https://youtu.be/...")

if st.button("🚀 AI 분석 시작", use_container_width=True):
    cleanup_files() # 시작 전 청소

    if not api_key:
        st.error("API 키를 입력해주세요.")
        st.stop()
    
    video_id = extract_video_id(video_url)
    if not video_id:
        st.error("올바른 유튜브 링크가 아닙니다.")
        st.stop()

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash') # 속도 빠른 모델 사용

    # 1단계: 자막 시도
    script_text = None
    with st.spinner("1단계: 자막을 찾아보는 중... 📜"):
        script_text = get_transcript_text(video_id)

    # 2단계: 자막 있으면 바로 분석, 없으면 오디오 다운로드
    if script_text:
        st.success("자막을 찾았습니다! 텍스트로 빠르게 분석합니다.")
        final_prompt = f"""
        당신은 1타 강사입니다. 아래 내용을 보고 1. 3줄 요약, 2. 핵심 단어 5개, 3. 객관식 문제 3개를 한국어로 작성하세요.
        [내용] {script_text[:30000]}
        """
        with st.spinner("🧠 뇌섹남 AI가 분석 중..."):
            response = model.generate_content(final_prompt)
            st.markdown(response.text)
            st.balloons()

    else:
        st.warning("자막이 없습니다! 👂 AI가 영상을 직접 듣기 시작합니다. (약 30초~1분 소요)")
        try:
            # 오디오 다운로드
            with st.spinner("🎵 영상에서 소리만 추출하는 중..."):
                audio_path = download_audio(video_url)
            
            # 오디오 업로드 및 분석
            with st.spinner("🧠 소리를 듣고 내용을 정리하는 중..."):
                audio_file = genai.upload_file(audio_path)
                
                # 파일 처리 대기
                while audio_file.state.name == "PROCESSING":
                    time.sleep(2)
                    audio_file = genai.get_file(audio_file.name)

                final_prompt = "이 오디오의 내용을 듣고 1. 3줄 요약, 2. 핵심 단어 5개, 3. 객관식 문제 3개를 한국어로 완벽하게 작성해줘."
                response = model.generate_content([final_prompt, audio_file])
                
                st.markdown(response.text)
                st.balloons()
                
                # 뒷정리
                cleanup_files()
                
        except Exception as e:
            st.error(f"오류가 발생했습니다: {e}")
            st.info("너무 긴 영상(10분 이상)은 오디오 처리가 실패할 수 있습니다.")
            import streamlit as st
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import yt_dlp
import os
import time
import re

# ==========================================
# 1. 페이지 설정 (아이콘, 레이아웃)
# ==========================================
st.set_page_config(
    page_title="윤희찬이 만든 영상 요약시키는 사이트",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==========================================
# 2. 커스텀 CSS (여기가 디자인의 핵심!)
# ==========================================
st.markdown("""
<style>
    /* 1. 전체 배경색 (고급진 다크 네이비) */
    .stApp {
        background-color: #0E1117;
        color: #FAFAFA;
    }
    
    /* 2. 입력창 디자인 */
    .stTextInput > div > div > input {
        background-color: #262730;
        color: #FAFAFA;
        border-radius: 10px;
        border: 1px solid #4B4B4B;
    }

    /* 3. 버튼 디자인 (네온 그라데이션) */
    .stButton > button {
        background: linear-gradient(45deg, #FF4B4B, #FF914D);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 0.5rem 1rem;
        font-weight: bold;
        width: 100%;
        transition: all 0.3s ease;
    }
    .stButton > button:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 15px rgba(255, 75, 75, 0.4);
    }

    /* 4. 결과 카드 디자인 */
    .result-card {
        background-color: #262730;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
        border-left: 5px solid #FF4B4B;
    }
    
    /* 5. 폰트 강조 */
    h1, h2, h3 {
        font-family: 'Sans-serif';
        font-weight: 700;
    }
</style>
""", unsafe_allow_html=True)

# ==========================================
# 3. 기능 함수 (엔진)
# ==========================================
def cleanup_files():
    for file in os.listdir():
        if file.endswith(".mp3") or file.endswith(".webm") or file.endswith(".m4a"):
            try: os.remove(file)
            except: pass

def extract_video_id(url):
    patterns = [r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',
                r'(?:shorts\/)([0-9A-Za-z_-]{11})', r'^([0-9A-Za-z_-]{11})$']
    for pattern in patterns:
        match = re.search(pattern, url)
        if match: return match.group(1)
    return None

def get_transcript_text(video_id):
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en', 'en-US', 'ja'])
        formatter = TextFormatter()
        return formatter.format_transcript(transcript)
    except: return None

def download_audio(url):
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{'key': 'FFmpegExtractAudio','preferredcodec': 'mp3','preferredquality': '192'}],
        'outtmpl': 'audio_sample.%(ext)s',
        'quiet': True
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    return "audio_sample.mp3"

# ==========================================
# 4. 메인 화면 UI
# ==========================================

# 사이드바
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/4712/4712038.png", width=50) # 로고 이미지
    st.title("Doctor AI")
    st.markdown("---")
    
    # API 키 입력
    if "GOOGLE_API_KEY" in st.secrets:
        api_key = st.secrets["GOOGLE_API_KEY"]
        st.success("✅ System Ready")
    else:
        api_key = st.text_input("🔑 Access Key", type="password")
        
    st.markdown("---")
    st.info("💡 **Pro Tip**\n\n자막이 없는 영상은\n자동으로 듣고 분석합니다.")
    st.caption("© 2026 Future Musk Corp.")

# 메인 타이틀
st.markdown("<h1 style='text-align: center; color: #FAFAFA;'>⚡ Doctor AI : Hyper Study</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align: center; color: #A0A0A0;'>유튜브 링크만 넣으세요. 나머지는 AI가 처리합니다.</p>", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True) # 공백

# 링크 입력창 (가운데 정렬 느낌)
col1, col2, col3 = st.columns([1, 6, 1])
with col2:
    video_url = st.text_input("🔗 YouTube Link", placeholder="여기에 링크를 붙여넣으세요 (Ctrl+V)")
    analyze_btn = st.button("🚀 분석 시작 (Analyze)")

# ==========================================
# 5. 실행 로직
# ==========================================
if analyze_btn:
    if not api_key:
        st.error("API Key가 필요합니다.")
        st.stop()
        
    if not video_url:
        st.warning("링크를 입력해주세요.")
        st.stop()
        
    cleanup_files()
    video_id = extract_video_id(video_url)
    
    if not video_id:
        st.error("잘못된 링크입니다.")
        st.stop()

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    # 상태창 디자인
    status_text = st.empty()
    progress_bar = st.progress(0)

    # 1. 자막 시도
    status_text.markdown("### 🔍 영상을 스캔하는 중...")
    progress_bar.progress(30)
    script_text = get_transcript_text(video_id)

    # 2. 분석 방식 결정
    final_content = ""
    
    if script_text:
        status_text.markdown("### 📜 자막 발견! 텍스트 분석 모드 가동")
        progress_bar.progress(60)
        
        prompt = f"""
        당신은 1타 강사입니다. 아래 내용을 보고 한국어로 작성하세요.
        형식: 1. 3줄 요약 (이모지 포함), 2. 핵심 단어 5개, 3. 객관식 문제 3개.
        [내용] {script_text[:30000]}
        """
        response = model.generate_content(prompt)
        final_content = response.text
        
    else:
        status_text.markdown("### 🎧 자막 없음! 오디오 청취 모드 가동 (약 30초 소요)")
        progress_bar.progress(50)
        
        try:
            audio_path = download_audio(video_url)
            progress_bar.progress(70)
            status_text.markdown("### 🧠 AI가 듣고 생각하는 중...")
            
            audio_file = genai.upload_file(audio_path)
            while audio_file.state.name == "PROCESSING":
                time.sleep(2)
                audio_file = genai.get_file(audio_file.name)
            
            prompt = "이 오디오를 듣고 한국어로 작성해줘: 1. 3줄 요약, 2. 핵심 단어 5개, 3. 객관식 문제 3개."
            response = model.generate_content([prompt, audio_file])
            final_content = response.text
            
        except Exception as e:
            st.error(f"오류 발생: {e}")
            st.stop()

    progress_bar.progress(100)
    status_text.empty() # 상태창 지우기
    time.sleep(0.5)

    # 결과 화면 (카드 디자인 적용)
    st.balloons()
    
    st.markdown("---")
    
    # 탭 디자인
    tab1, tab2, tab3 = st.tabs(["📑 요약 노트", "🔑 암기 단어", "💯 실전 문제"])
    
    # AI 응답을 탭에 나눠서 보여주는 건 복잡하니, 
    # 통으로 보여주되 CSS 상자 안에 예쁘게 넣기
    
    with tab1:
        st.markdown(f"""
        <div class="result-card">
            <h3>📝 AI 분석 리포트</h3>
            {final_content}
        </div>
        """, unsafe_allow_html=True)
        
    with tab2:
        st.info("💡 위 리포트에서 [핵심 단어] 파트를 참고하세요.")
    
    with tab3:
        st.success("✅ 위 리포트에서 [객관식 문제] 파트를 참고하세요.")

    cleanup_files()

