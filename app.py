import streamlit as st
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi

# 1. 페이지 설정
st.set_page_config(
    page_title="닥터 AI - 유튜브 완벽 요약",
    page_icon="🎬",
    layout="wide"
)

# 2. 비밀 키 가져오기
if "GOOGLE_API_KEY" in st.secrets:
    api_key = st.secrets["GOOGLE_API_KEY"]
else:
    with st.sidebar:
        api_key = st.text_input("🔑 API 키가 필요합니다", type="password")

# 3. 메인 화면 디자인
st.title("🎬 닥터 AI : 링크만 넣으면 공부 끝!")
st.markdown("### 유튜브 링크(URL)만 붙여넣으세요. 나머진 제가 다 합니다.")

# 4. 사이드바 설명
with st.sidebar:
    st.header("사용법 💡")
    st.write("1. 유튜브 영상 링크를 복사하세요.")
    st.write("2. 입력창에 붙여넣고 엔터!")
    st.markdown("---")
    st.write("Create by. **미래의 일론 머스크**")

# 5. 유튜브 링크 입력받기 (여기가 핵심!)
video_url = st.text_input("👇 여기에 유튜브 링크를 붙여넣으세요:", placeholder="https://www.youtube.com/watch?v=...")

# 6. 실행 로직
if st.button("🚀 AI 분석 시작 (Click)", use_container_width=True):
    if not api_key:
        st.error("설정 오류: API 키가 없습니다.")
    elif not video_url:
        st.warning("유튜브 링크를 입력해주세요! 🔗")
    else:
        try:
            # 6-1. 유튜브 URL에서 비디오 ID 추출하기
            video_id = ""
            if "v=" in video_url:
                video_id = video_url.split("v=")[1].split("&")[0]
            elif "youtu.be/" in video_url:
                video_id = video_url.split("youtu.be/")[1].split("?")[0]
            
            if not video_id:
                st.error("올바른 유튜브 링크가 아닙니다. 확인해주세요!")
            else:
                with st.spinner("1단계: 자막을 추출하는 중입니다... 🎞️"):
                    # 6-2. 자막 가져오기 (한국어 우선, 없으면 영어)
                    transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en'])
                    
                    # 자막 텍스트만 합치기
                    script_text = ""
                    for line in transcript_list:
                        script_text += line['text'] + " "

                with st.spinner("2단계: AI 선생님이 분석 중입니다... 🧠"):
                    # 6-3. AI에게 요약 시키기
                    genai.configure(api_key=api_key)
                    model = genai.GenerativeModel('gemini-pro')
                    
                    prompt = f"""
                    당신은 대한민국 최고의 1타 강사입니다. 학생이 입력한 스크립트를 분석해서 시험에 완벽하게 대비할 수 있도록 정리해주세요.
                    반드시 아래 3가지 형식으로 나누어 답변해주세요.

                    [Part 1. 3줄 요약]
                    - 전체 내용을 초등학생도 이해할 수 있게 가장 중요한 3문장으로 요약할 것.

                    [Part 2. 핵심 키워드 & 설명]
                    - 시험에 나올 확률이 높은 전문 용어나 핵심 단어 5개를 뽑을 것.
                    - 각 단어에 대한 쉬운 설명을 한 줄씩 덧붙일 것.

                    [Part 3. 실전 객관식 문제]
                    - 내용을 바탕으로 4지 선다형 객관식 문제 3개를 만들 것.
                    - 문제 바로 아래에 정답과 명쾌한 해설을 달아줄 것.
                    - 정답은 **볼드체**로 강조할 것.

                    [분석할 내용]
                    {script_text[:10000]} 
                    """
                    # (내용이 너무 길면 오류가 날 수 있어 10000자 정도로 자름)

                    response = model.generate_content(prompt)
                    
                    st.success("분석 완료! 아래 탭을 눌러 확인하세요.")
                    st.balloons()
                    
                    tab1, tab2, tab3 = st.tabs(["📑 3줄 요약", "🔑 핵심 단어", "💯 실전 문제"])
                    
                    with tab1:
                        st.markdown("### 📝 바쁘면 이것만 봐!")
                        st.write(response.text) 
                    
                    with tab2:
                        st.info("이 단어만 외우면 시험 통과!")
                        st.markdown("👉 **AI가 분석한 내용에서 [Part 2]를 확인하세요.**")

                    with tab3:
                        st.warning("정답을 먼저 보지 말고 풀어보세요!")
                        st.markdown("👉 **AI가 분석한 내용에서 [Part 3]를 확인하세요.**")

        except Exception as e:
            st.error(f"오류가 발생했습니다: {e}")
            st.info("💡 팁: 자막이 없는 영상이거나, 링크가 잘못되었을 수 있습니다.")
