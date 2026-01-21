const agents = [
    {
        id: 'spellcheck',
        name: '맞춤법 교정',
        description: '텍스트의 맞춤법과 문법 오류를 자동으로 검출하고 수정 제안을 제공합니다. 비즈니스 이메일이나 보고서 작성 시 유용합니다.',
        features: ['한국어 맞춤법 검사', '문맥에 맞는 단어 추천', '띄어쓰기 교정']
    },
    {
        id: 'doc-chat',
        name: '사내 문서 기반 챗봇',
        description: '업로드한 문서를 분석하여 질문에 대한 정확한 답변을 제공합니다. 긴 문서를 모두 읽지 않아도 핵심 내용을 파악할 수 있습니다.',
        features: ['PDF, Word 문서 인식', '문서 내용 기반 질의응답', '출처 페이지 표기']
    },
    {
        id: 'report-gen',
        name: '보고서 작성',
        description: '입력된 데이터와 주제를 바탕으로 전문적인 보고서 초안을 자동으로 생성합니다. 서론, 본론, 결론 구조를 갖춘 글을 작성합니다.',
        features: ['개요 자동 생성', '데이터 시각화 제안', '비즈니스 톤 앤 매너 적용']
    },
    {
        id: 'translate',
        name: '번역',
        description: '다양한 언어로 번역을 수행하며, 단순 번역을 넘어 문화적 뉘앙스까지 고려한 자연스러운 표현을 제안합니다.',
        features: ['다국어 번역 지원', '전문 용어 번역 최적화', '번역투 교정']
    },
    {
        id: 'stt-summary',
        name: 'STT 통합 요약',
        description: '음성 파일을 텍스트로 변환하고, 긴 대화 내용을 요약하여 핵심 안건과 결정 사항을 정리해줍니다.',
        features: ['음성 -> 텍스트 변환', '회의록 자동 생성', '주요 키워드 추출']
    }
];

let selectedAgentId = null;

document.addEventListener('DOMContentLoaded', () => {
    renderAgentList();
    setupEventListeners();
});

function renderAgentList() {
    const agentList = document.getElementById('agentList');
    agentList.innerHTML = agents.map(agent => `
        <div class="agent-card" onclick="selectAgent('${agent.id}', this)">
            <div class="agent-radio"></div>
            <div class="agent-info">
                <div class="agent-name">${agent.name}</div>
            </div>
            <button class="detail-btn" onclick="openModal('${agent.id}', event)">자세히</button>
        </div>
    `).join('');
}

function selectAgent(agentId, element) {
    if (selectedAgentId === agentId) return; // 이미 선택됨

    selectedAgentId = agentId;

    // UI 업데이트
    document.querySelectorAll('.agent-card').forEach(card => card.classList.remove('selected'));
    element.classList.add('selected');

    // Indicator 업데이트
    const agent = agents.find(a => a.id === agentId);
    const indicator = document.getElementById('selectedAgentIndicator');
    const nameSpan = document.getElementById('currentAgentName');

    if (agent) {
        indicator.style.display = 'inline-block';
        nameSpan.textContent = agent.name;
    }
}

function openModal(agentId, event) {
    event.stopPropagation(); // 카드 선택 이벤트 전파 방지

    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    document.getElementById('modalAgentName').textContent = agent.name;
    document.getElementById('modalAgentDesc').textContent = agent.description;

    const featuresList = document.getElementById('modalAgentFeatures');
    featuresList.innerHTML = agent.features.map(f => `<li>${f}</li>`).join('');

    // 모달 버튼에 현재 Agent 선택 기능 연결
    const useBtn = document.getElementById('useAgentBtn');
    useBtn.onclick = () => {
        // 해당 카드를 찾아서 클릭 트리거
        const cards = document.querySelectorAll('.agent-card');
        const cardIndex = agents.findIndex(a => a.id === agentId);
        if (cardIndex >= 0 && cards[cardIndex]) {
            selectAgent(agentId, cards[cardIndex]);
        }
        closeModal();
    };

    const modal = document.getElementById('agentModal');
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('agentModal');
    modal.classList.remove('active');
}

function setupEventListeners() {
    // History Toggle
    const historyBtn = document.getElementById('historyToggleBtn');
    const sidebarLeft = document.getElementById('sidebarLeft');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');

    historyBtn.addEventListener('click', () => {
        sidebarLeft.classList.add('open');
        document.body.classList.add('history-open');
    });

    closeHistoryBtn.addEventListener('click', () => {
        sidebarLeft.classList.remove('open');
        document.body.classList.remove('history-open');
    });

    // Close Modal
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('agentModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('agentModal')) {
            closeModal();
        }
    });

    // File Upload Mock
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary-blue)';
        dropZone.style.backgroundColor = '#f0f7ff';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color)';
        dropZone.style.backgroundColor = '#fafbfd';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color)';
        dropZone.style.backgroundColor = '#fafbfd';
        alert('파일 업로드 기능은 데모 버전에서 지원되지 않습니다.');
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            alert(`'${fileInput.files[0].name}' 파일이 선택되었습니다. (데모)`);
        }
    });

    // URL Addition Mock
    const addUrlBtn = document.getElementById('addUrlBtn');
    const urlInput = document.getElementById('urlInput');

    addUrlBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
            alert(`URL이 추가되었습니다:\n${url}`);
            urlInput.value = ''; // Clear input
        } else {
            alert('URL을 입력해주세요.');
        }
    });

    // Allow Enter key to submit URL
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addUrlBtn.click();
        }
    });
}
