import streamlit as st
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import re

# ==========================================
# 1. 페이지 설정 (아이콘, 레이아웃)
# ==========================================
st.set_page_config(
    page_title="닥터 AI - 만능 공부봇 (Final)",
    page_icon="🎓",
    layout="wide"
)

# ==========================================
# 2. 기능 함수 모음 (여기가 '엔진'입니다)
# ==========================================

# 2-1. 어떤 유튜브 링크든 ID만 뽑아내는 정규표현식 함수
def extract_video_id(url):
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',  # 기본형
        r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})', # 단축형
        r'(?:shorts\/)([0-9A-Za-z_-]{11})', # 쇼츠
        r'(?:embed\/)([0-9A-Za-z_-]{11})', # 임베드
        r'^([0-9A-Za-z_-]{11})$' # 그냥 ID만 넣었을 때
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

# 2-2. 자막 가져오기 (한국어 -> 영어 -> 자동생성 순서로 시도)
def get_transcript(video_id):
    try:
        # 한국어, 영어, 자동생성된 자막까지 싹 다 긁어오기 시도
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en', 'en-US', 'ja'])
        formatter = TextFormatter()
        return formatter.format_transcript(transcript)
    except Exception as e:
        # 자막이 아예 없는 경우
        return None

# ==========================================
# 3. 사이드바 (설정 메뉴)
# ==========================================
with st.sidebar:
    st.header("⚙️ 설정")
    
    # 비밀 키 관리 (Secrets 우선, 없으면 입력창)
    if "GOOGLE_API_KEY" in st.secrets:
        api_key = st.secrets["GOOGLE_API_KEY"]
        st.success("✅ API 키가 연동되었습니다.")
    else:
        api_key = st.text_input("🔑 구글 API 키 입력", type="password")
        st.info("한 번 입력하면 계속 쓸 수 있습니다.")
    
    st.markdown("---")
    st.write("### 💡 사용 꿀팁")
    st.caption("1. 영상이 너무 길면(1시간 이상) 분석이 오래 걸릴 수 있어요.")
    st.caption("2. '자막이 없는 영상'은 분석할 수 없어요.")
    st.markdown("---")
    st.write("Developed by **Future Musk**")

# ==========================================
# 4. 메인 화면 UI
# ==========================================
st.title("🎓 닥터 AI : 링크만 넣으면 공부 끝!")
st.markdown("#### 유튜브 링크를 넣으세요. 요약, 단어, 문제까지 한 번에 끝냅니다.")

# 링크 입력창
video_url = st.text_input("👇 유튜브 링크 (Ctrl+V)", placeholder="https://www.youtube.com/watch?v=...")

# ==========================================
# 5. 실행 로직 (에러 방지 처리 완벽 적용)
# ==========================================
if st.button("🚀 AI 분석 시작", use_container_width=True):
    # [체크 1] API 키 확인
    if not api_key:
        st.error("🚨 API 키가 없습니다! 왼쪽 사이드바에 입력해주세요.")
        st.stop() # 여기서 멈춤
    
    # [체크 2] 링크 입력 확인
    if not video_url:
        st.warning("🔗 링크를 입력하지 않았습니다.")
        st.stop()

    # [체크 3] 유효한 링크인지 확인
    video_id = extract_video_id(video_url)
    if not video_id:
        st.error("🚨 올바른 유튜브 링크가 아닙니다. 다시 확인해주세요.")
        st.stop()

    # 작업 시작
    try:
        with st.spinner("1단계: 영상 자막을 추출하고 있습니다... 🎞️"):
            script_text = get_transcript(video_id)
            
            # [체크 4] 자막 유무 확인
            if not script_text:
                st.error("😭 이 영상은 자막(스크립트)이 없어서 분석할 수 없습니다.")
                st.info("Tip: 자막이 있는 다른 영상을 시도해보세요!")
                st.stop()

            # [체크 5] 내용이 너무 길 때 (3만 자로 자름 - AI 뇌부하 방지)
            if len(script_text) > 30000:
                script_text = script_text[:30000]
                st.warning("⚠️ 영상이 너무 길어서 앞부분 3만 자만 분석합니다.")

        with st.spinner("2단계: 1타 강사 AI가 분석 중입니다... (약 10초 소요) 🧠"):
            # AI 설정
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-pro')
            
            # 프롬프트 (번역 기능 추가됨)
            prompt = f"""
            당신은 최고의 1타 강사입니다. 주어진 스크립트를 보고 학생을 위한 완벽한 학습 자료를 만드세요.
            스크립트가 영어나 다른 언어라면 반드시 **한국어**로 번역해서 답변하세요.

            [필수 포함 내용]
            1. **3줄 요약**: 초등학생도 이해하게 핵심만 요약 (이모지 사용).
            2. **핵심 단어장**: 시험에 나올법한 중요 단어 5개와 뜻 풀이.
            3. **객관식 문제**: 4지 선다형 문제 3개 (정답은 볼드체 표시).

            [분석할 스크립트]
            {script_text}
            """
            
            # AI 실행
            response = model.generate_content(prompt)
            
            # 결과 출력
            st.balloons()
            st.success("분석 완료! 아래 탭을 눌러 확인하세요.")
            
            # 탭 구성
            tab1, tab2, tab3, tab4 = st.tabs(["📑 요약", "🔑 단어", "💯 문제", "📜 자막 원본"])
            
            with tab1:
                st.markdown(response.text) # 전체 내용을 먼저 보여줌 (가장 안전함)
            with tab2:
                st.info("핵심 단어를 암기하세요.")
                st.write("위 내용 중 [핵심 단어장] 파트를 참고하세요.")
            with tab3:
                st.warning("문제를 풀어보세요.")
                st.write("위 내용 중 [객관식 문제] 파트를 참고하세요.")
            with tab4:
                with st.expander("자막 원본 보기"):
                    st.text(script_text)

    except Exception as e:
        # [체크 6] 알 수 없는 에러 방어
        st.error("오류가 발생했습니다!")
        st.write(f"에러 내용: {e}")
        st.info("혹시 API 키가 정확한지, 인터넷 연결이 잘 되어 있는지 확인해주세요.")
