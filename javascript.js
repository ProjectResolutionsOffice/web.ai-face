Kakao.init('fac5df1c693b885ee4ea1ce4a187f2a6');
// 모델 폴더 경로
const MALE_MODEL_URL = "./tm-my-image-model/";
const FEMALE_MODEL_URL = "./woman/";

let model, webcam, rafId, maxPredictions;
let currentResult = { type: '', prob: 0 };
let currentMode = '';
let currentTestMode = '';
let currentGender = 'male'; // 'male' 또는 'female'
let loadedModelGender = null; // 현재 로드된 모델의 성별을 추적

// 궁합 테스트 관련 상태 변수
const coupleTestState = {
    player1: { image: null, gender: 'male', result: null },
    player2: { image: null, gender: 'male', result: null }
};
let currentWebcamPlayer = null; // 'player1' 또는 'player2'

const screens = {
    initial: document.getElementById('initial-screen'),
    testMode: document.getElementById('test-mode-screen'),
    loadingCamera: document.getElementById('loading-camera-screen'),
    coupleTest: document.getElementById('couple-test-screen'),
    coupleWebcam: document.getElementById('couple-webcam-screen'),
    result: document.getElementById('result-screen'),
    coupleResult: document.getElementById('couple-result-screen'),
    retry: document.getElementById('retry-screen')
};
const loadingUi = document.getElementById('loading-ui');
const loadingText = document.getElementById('loading-text');
const webcamContainer = document.getElementById('webcam-container');
const resultImageContainer = document.getElementById('result-image-container');
const resultContainer = document.getElementById('result-container');
const resultDescriptionContainer = document.getElementById('result-description-container');
const resultTitle = document.getElementById('result-title');
const genderToggle = document.getElementById('gender-toggle');
const fileUploadInput = document.getElementById('file-upload');
const captureButton = document.getElementById('capture-button');
const retryTitle = document.getElementById('retry-title');
const retryMessage = document.getElementById('retry-message');
const testModeMain = document.getElementById('test-mode-main');

// 궁합 테스트 관련 요소
const player1GenderToggle = document.getElementById('player1-gender-toggle');
const player2GenderToggle = document.getElementById('player2-gender-toggle');
const startCoupleTestBtn = document.getElementById('start-couple-test-btn');
const player1ImageContainer = document.getElementById('player1-image-container');
const player2ImageContainer = document.getElementById('player2-image-container');
const player1FileInput = document.getElementById('player1-file-input');
const player2FileInput = document.getElementById('player2-file-input');
const player1ResultImage = document.getElementById('player1-result-image');
const player2ResultImage = document.getElementById('player2-result-image');
const player1ResultInfo = document.getElementById('player1-result-info');
const player2ResultInfo = document.getElementById('player2-result-info');
const coupleMatchText = document.getElementById('couple-match-text');
const couplePastLifeText = document.getElementById('couple-past-life-text');
const coupleWebcamContainer = document.getElementById('couple-webcam-container');
const coupleWebcamTitle = document.getElementById('couple-webcam-title');

genderToggle.addEventListener('change', (event) => {
    currentGender = event.target.checked ? 'female' : 'male';
});

player1GenderToggle.addEventListener('change', (event) => {
    coupleTestState.player1.gender = event.target.checked ? 'female' : 'male';
});

player2GenderToggle.addEventListener('change', (event) => {
    coupleTestState.player2.gender = event.target.checked ? 'female' : 'male';
});

function updateCoupleTestButton() {
    if (coupleTestState.player1.image && coupleTestState.player2.image) {
        startCoupleTestBtn.disabled = false;
        startCoupleTestBtn.classList.remove('bg-gray-600', 'hover:bg-gray-500');
        startCoupleTestBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
    } else {
        startCoupleTestBtn.disabled = true;
        startCoupleTestBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        startCoupleTestBtn.classList.add('bg-gray-600', 'hover:bg-gray-500');
    }
}

function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active-screen');
        screen.style.display = 'none'; // DOM에서 완전히 숨김
    });
    const activeScreen = screens[screenName];
    activeScreen.style.display = 'flex'; // Flexbox로 표시
    setTimeout(() => {
        activeScreen.classList.add('active-screen');
    }, 10); // 부드러운 전환을 위한 작은 지연
}

async function startTest(mode) {
    currentMode = mode;
    if (currentMode === 'single') {
        showScreen('testMode');
    } else if (currentMode === 'couple') {
        showScreen('coupleTest');
    }
}

async function loadModelIfNeeded(gender) {
    if (model && loadedModelGender === gender) {
        return;
    }

    const modelBaseURL = (gender === 'male') ? MALE_MODEL_URL : FEMALE_MODEL_URL;
    const modelURL = modelBaseURL + "model.json";
    const metadataURL = modelBaseURL + "metadata.json";
    
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    loadedModelGender = gender;
}

async function runAnalysis(testMode) {
    currentTestMode = testMode;
    
    testModeMain.classList.add('hidden');
    loadingUi.classList.remove('hidden');
    loadingText.textContent = 'AI 모델을 불러오는 중입니다...';

    try {
        await loadModelIfNeeded(currentGender);
        
        loadingUi.classList.add('hidden');
        testModeMain.classList.remove('hidden');

        if (currentTestMode === 'webcam') {
            showScreen('loadingCamera');
            await initWebcam(webcamContainer);
        } else { // file mode
            fileUploadInput.click();
        }
    } catch (error) {
        console.error("테스트 초기화 오류:", error);
        const errorMessage = `모델 로딩에 실패했습니다. (원인: ${error.message})\n\n[해결 방안]\n1. 인터넷 연결을 확인해주세요.\n2. Live Server와 같은 로컬 웹서버에서 다시 시도해보세요.`;
        alert(errorMessage);
        resetTest();
    }
}

async function initWebcam(container) {
    const flip = true;
    const size = 500;
    
    webcam = new tmImage.Webcam(size, size, flip);
    
    try {
        await webcam.setup();
        container.innerHTML = '';
        container.appendChild(webcam.canvas);
        await webcam.play();
        window.requestAnimationFrame(loop);
    } catch (webcamError) {
        console.error("웹캠 초기화 오류:", webcamError);
        let message = "카메라를 찾을 수 없습니다. 다른 장치를 확인하거나 다시 시도해주세요.";
        if (webcamError.name === 'NotAllowedError') {
            message = "카메라 사용 권한이 거부되었습니다. 브라우저 설정에서 카메라 접근을 허용하고 다시 시도해주세요.";
        }
        alert(message);
        resetTest();
    }
}

async function loop() {
    if (webcam) {
        webcam.update();
        await predict(webcam.canvas);
        rafId = window.requestAnimationFrame(loop);
    }
}

function capturePhoto() {
    if (!webcam) return;

    webcam.stop();
    if (rafId) window.cancelAnimationFrame(rafId);
    
    showResultScreenAndPredict(webcam.canvas);
}

async function predict(image) {
    if (!model) {
        console.error("모델이 로드되지 않았습니다.");
        return;
    }
    const prediction = await model.predict(image);
    let highestProb = 0;
    let highestIndex = -1;

    for (let i = 0; i < prediction.length; i++) {
        const prob = prediction[i].probability;
        if (prob > highestProb) {
            highestProb = prob;
            highestIndex = i;
        }
    }

    const highestClassName = model.getClassLabels()[highestIndex];
    if (highestClassName === '재검사') {
            if (currentGender === 'female') {
                retryTitle.textContent = '혹시 공주야?';
                retryMessage.textContent = '공주사전 봐야돼서 한번만 더 찍어줘..ㅠㅠ';
            } else {
                retryTitle.textContent = '재검사 오류!';
                retryMessage.textContent = '카메라 닦고 한번만 더..해보쉴래요..? 좀 이상한디..';
            }
            showScreen('retry');
            return;
    }
}

function getResultText(className, probability, gender) {
    if (gender === 'male') {
        switch(className) {
            case '테토남':
                if (probability >= 90) return `그래서? 자신있다고?<br>급 <b><u>그냥 테토짱</u></b>`;
                if (probability >= 70) return `솔직히 내가 아니면 누가 테토남이냐고<br>급 <b><u>테토가이</u></b>`;
                if (probability >= 50) return `애매하긴 해~<br>급 <b><u>테토남</u></b>`;
                return `${probability.toFixed(1)}% 확률로 테토남입니다.`;
            case '에겐남':
                if (probability >= 90) return `니가 나 지켜<br>급 <b><u>에겐킹카</u></b>`;
                if (probability >= 70) return `왜 연락안보지? 정 털렸나?<br>급 <b><u>에겐프린스</u></b>`;
                if (probability >= 50) return `왜 나 신경 안써줘?<br>급 <b><u>에겐남</u></b>`;
                return `${probability.toFixed(1)}% 확률로 에겐남입니다.`;
            case '재검사':
                return `재검사 필요`;
            default:
                return `결과를 알 수 없습니다.`;
        }
    } else if (gender === 'female') {
        switch(className) {
            case '테토녀':
                if (probability >= 90) return `창피하니까 프로포즈는<br>둘이 있을때 해.<br>아니면 걍 내가 할거임ㅇㅇ<br>급 <b><u>테토창시자</u></b>`;
                if (probability >= 70) return `아니 오늘 몇 차까지<br>갈꺼냐고 이것아<br>급 <b><u>테토지도자</u></b>`;
                if (probability >= 50) return `귀여워 해주면 좋긴한데..<br>애매하긴 해~ 헿<br>급 <b><u>수줍 테토녀</u></b>`;
                return `${probability.toFixed(1)}% 확률로 테토녀입니다.`;
            case '에겐녀':
                if (probability >= 90) return `꾸꾸까까<br>급 <b><u>'에겐'그 자체</u></b>`;
                if (probability >= 70) return `키만 작지 박력은 말도 안된다고!<br>급 <b><u>에겐햄스터</u></b>`;
                if (probability >= 50) return `같이 해보고 싶은데..<br>급 <b><u>에겐녀..뭔진 몰라도 좀 해주자</u></b>`;
                return `${probability.toFixed(1)}% 확률로 에겐녀입니다.`;
            case '재검사':
                return `재검사 필요`;
            default:
                return `결과를 알 수 없습니다.`;
        }
    }
}

function setupResultContainer(prediction) {
    resultContainer.innerHTML = '';
    resultDescriptionContainer.innerHTML = '';

    let highestProb = 0;
    let highestIndex = -1;
    
    for (let i = 0; i < prediction.length; i++) {
        const prob = prediction[i].probability;
        const className = model.getClassLabels()[i];

        if (prob > highestProb) {
            highestProb = prob;
            highestIndex = i;
        }
        
        if (className === '재검사') continue;

        const probPercent = (prob * 100).toFixed(1);
        const classHtml = `
            <div class="class-prediction" data-index="${i}">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-lg font-medium">${className}</span>
                    <span id="prob-${i}" class="text-gray-400 font-mono">${probPercent}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2.5">
                    <div id="bar-${i}" class="bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out" style="width: ${probPercent}%"></div>
                </div>
            </div>`;
        resultContainer.innerHTML += classHtml;
    }

    if(highestIndex !== -1) {
        const highestClassEl = resultContainer.querySelector(`.class-prediction[data-index="${highestIndex}"] span:first-child`);
        if(highestClassEl) {
            highestClassEl.classList.add('text-indigo-400', 'neon-text', 'font-bold');
            currentResult = {
                type: prediction[highestIndex].className,
                prob: (prediction[highestIndex].probability * 100).toFixed(1)
            };
        }
    }

    const resultText = getResultText(currentResult.type, parseFloat(currentResult.prob), currentGender);
    const resultDescription = document.createElement('p');
    resultDescription.classList.add('text-gray-300', 'mt-4', 'text-lg', 'font-medium', 'text-center', 'md:text-left', 'font-bold');
    resultDescription.innerHTML = resultText;
    resultDescriptionContainer.appendChild(resultDescription);
}

async function showResultScreenAndPredict(imageElement) {
        const prediction = await model.predict(imageElement);
        let highestProb = 0;
        let highestIndex = -1;

        for (let i = 0; i < prediction.length; i++) {
            const prob = prediction[i].probability;
            if (prob > highestProb) {
                highestProb = prob;
                highestIndex = i;
            }
        }

        const highestClassName = model.getClassLabels()[highestIndex];
        if (highestClassName === '재검사') {
            if (currentGender === 'female') {
                retryTitle.textContent = '혹시 공주야?';
                retryMessage.textContent = '공주사전 봐야돼서 한번만 더 찍어줘..ㅠㅠ';
            } else {
                retryTitle.textContent = '재검사 오류!';
                retryMessage.textContent = '카메라 닦고 한번만 더..해보쉴래요..? 좀 이상한디..';
            }
            showScreen('retry');
            return;
        }
        
        resultTitle.textContent = '싱글 분석 결과';
        resultImageContainer.innerHTML = '';
        const resultImg = new Image();
        resultImg.src = imageElement.toDataURL ? imageElement.toDataURL('image/jpeg') : imageElement.src;
        resultImg.classList.add('w-full', 'h-full', 'object-cover');
        resultImg.style.transform = 'scaleX(-1)';
        resultImg.alt = "분석 결과 이미지";
        resultImageContainer.appendChild(resultImg);
        
        setupResultContainer(prediction);
        showScreen('result');
}

// --- 궁합 테스트 관련 함수 ---
async function startCoupleAnalysis(player, method) {
    currentWebcamPlayer = player;
    
    const gender = coupleTestState[player].gender;
    
    testModeMain.classList.add('hidden');
    loadingUi.classList.remove('hidden');
    loadingText.textContent = `AI 모델을 불러오는 중입니다...`;
    
    try {
        await loadModelIfNeeded(gender);
        loadingUi.classList.add('hidden');
        testModeMain.classList.remove('hidden');

        if (method === 'webcam') {
            coupleWebcamTitle.textContent = (player === 'player1') ? '플레이어 1 사진 촬영' : '플레이어 2 사진 촬영';
            showScreen('coupleWebcam');
            await initWebcam(coupleWebcamContainer);
        } else if (method === 'file') {
            const fileInput = (player === 'player1') ? player1FileInput : player2FileInput;
            fileInput.click();
        }

    } catch (error) {
        console.error("모델 로딩 오류:", error);
        alert("모델 로딩 중 오류가 발생했습니다. 다시 시도해주세요.");
        resetTest();
    }
}

player1FileInput.addEventListener('change', (event) => handleCoupleFileInput(event, 'player1'));
player2FileInput.addEventListener('change', (event) => handleCoupleFileInput(event, 'player2'));

function handleCoupleFileInput(event, player) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.classList.add('w-full', 'h-full', 'object-cover');
        img.style.transform = 'scaleX(-1)';
        img.alt = `${player === 'player1' ? '플레이어 1' : '플레이어 2'}가 업로드한 사진`; // 이 줄을 추가합니다.

        const container = (player === 'player1') ? player1ImageContainer : player2ImageContainer;
        container.innerHTML = '';
        container.classList.remove('flex');
        container.appendChild(img);

        coupleTestState[player].image = img;
        updateCoupleTestButton();
    };
    reader.readAsDataURL(file);
}

function captureCouplePhoto() {
        if (!webcam) return;
    
    const capturedCanvas = document.createElement('canvas');
    const context = capturedCanvas.getContext('2d');
    capturedCanvas.width = webcam.canvas.width;
    capturedCanvas.height = webcam.canvas.height;
    context.drawImage(webcam.canvas, 0, 0, capturedCanvas.width, capturedCanvas.height);
    
    webcam.stop();
    if (rafId) window.cancelAnimationFrame(rafId);
    
    const img = new Image();
    img.src = capturedCanvas.toDataURL('image/jpeg');
    img.classList.add('w-full', 'h-full', 'object-cover');
    img.style.transform = 'scaleX(-1)';
    img.alt = `${currentWebcamPlayer === 'player1' ? '플레이어 1' : '플레이어 2'}가 카메라로 촬영한 사진`; // 이 줄을 추가합니다.
    
    const container = (currentWebcamPlayer === 'player1') ? player1ImageContainer : player2ImageContainer;
    container.innerHTML = '';
    container.appendChild(img);

    coupleTestState[currentWebcamPlayer].image = capturedCanvas;
    updateCoupleTestButton();
    backToCoupleTestScreen();
}

function backToCoupleTestScreen() {
        if (webcam && webcam.running) {
        webcam.stop();
    }
    if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
    }
    coupleWebcamContainer.innerHTML = '';
    showScreen('coupleTest');
}

async function startCoupleTest() {
    if (!coupleTestState.player1.image || !coupleTestState.player2.image) {
        alert("두 사람의 사진을 모두 업로드해주세요.");
        return;
    }
    
    loadingUi.classList.remove('hidden');
    loadingText.textContent = '궁합을 분석하고 있습니다...';

    try {
        const p1Gender = coupleTestState.player1.gender;
        const p2Gender = coupleTestState.player2.gender;
        
        // 플레이어 1 모델 로드
        const p1ModelUrl = (p1Gender === 'male') ? MALE_MODEL_URL : FEMALE_MODEL_URL;
        const p1Model = await tmImage.load(p1ModelUrl + 'model.json', p1ModelUrl + 'metadata.json');
        const p1Prediction = await p1Model.predict(coupleTestState.player1.image);
        coupleTestState.player1.result = getBestPrediction(p1Prediction);
        
        // 플레이어 2 모델 로드
        const p2ModelUrl = (p2Gender === 'male') ? MALE_MODEL_URL : FEMALE_MODEL_URL;
        const p2Model = await tmImage.load(p2ModelUrl + 'model.json', p2ModelUrl + 'metadata.json');
        const p2Prediction = await p2Model.predict(coupleTestState.player2.image);
        coupleTestState.player2.result = getBestPrediction(p2Prediction);

        showCoupleResultScreen();
    } catch (error) {
        console.error("궁합 분석 오류:", error);
        alert("궁합 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
        resetTest();
    }
}

function getBestPrediction(predictions) {
    let best = { className: '재검사', probability: 0 };
    predictions.forEach(p => {
        if (p.probability > best.probability && p.className !== '재검사') {
            best = p;
        }
    });
    if (best.className === '재검사' && predictions.length > 1) {
        best = predictions.sort((a, b) => b.probability - a.probability)[1];
    }
    return best;
}

function getCoupleResultText(p1, p2) {
    const p1Type = p1.className;
    const p2Type = p2.className;
    const p1Prob = p1.probability * 100;
    const p2Prob = p2.probability * 100;
    
    const p1IsTeto = p1Type.includes('테토');
    const p2IsTeto = p2Type.includes('테토');
    const p1IsEgen = p1Type.includes('에겐');
    const p2IsEgen = p2Type.includes('에겐');
    
    const isHighP1 = p1Prob >= 70;
    const isHighP2 = p2Prob >= 70;
    const isVeryHighP1 = p1Prob >= 90;
    const isVeryHighP2 = p2Prob >= 90;
    
    let compatibilityText = '';
    let pastLifeText = '';

    if (p1IsTeto && p2IsTeto) {
        if (isVeryHighP1 && isVeryHighP2) {
            compatibilityText = `<b><span class="text-red-400">🔥 불꽃처럼 타오르는 궁합 🔥</span></b><br>두 사람의 넘치는 카리스마가 만나면<br>무엇이든 해낼 수 있는 최고의 파트너가 될 것입니다. 때로는 강하게 부딪히겠지만, 서로를 이해하면 그 누구도 막을 수 없는 조합입니다.`;
            pastLifeText = `전생에 이 나라를 함께 다스리던 <b>왕과 왕비</b>였던 두 사람! 이번 생에도 만나 제왕의 기운으로 모든 것을 손에 넣을 것입니다.`;
        } else if (isHighP1 || isHighP2) {
            compatibilityText = `<b><span class="text-orange-400">✨ 에너지 넘치는 궁합 ✨</span></b><br>한 명의 리더십이 다른 한 명의 에너지를 이끌어내는<br>건강하고 활기찬 관계입니다. 서로의 의견을 존중해준다면 완벽한 조화를 이룰 거예요.`;
            pastLifeText = `전생에 서로 다른 진영의 <b>라이벌 장군</b>이었던 두 사람. 끝없는 다툼 끝에 서로의 가치를 인정했듯, 이번 생에는 함께 힘을 합쳐 위대한 성공을 이룰 것입니다.`;
        } else {
            compatibilityText = `<b><span class="text-yellow-400">☀️ 티키타카 궁합 ☀️</span></b><br>서로의 긍정적인 에너지가 만나 즐거운 시간을 보낼 수 있습니다.<br>큰 갈등 없이 편안하고 유쾌한 관계를 유지할 수 있어요.`;
            pastLifeText = `전생에 같은 도량의 <b>스승과 제자</b>였던 두 사람. 서로에게 부족한 점을 채워주며 함께 성장하는 관계입니다. 이번 생에도 서로에게 좋은 영향을 주며 발전할 것입니다.`;
        }
    }
    else if (p1IsEgen && p2IsEgen) {
        if (isVeryHighP1 && isVeryHighP2) {
            compatibilityText = `<b><span class="text-indigo-400">💕 서로에게 스며드는 궁합 💕</span></b><br>서로를 향한 애정과 관심이 넘쳐 흐르는 천생연분!<br>둘이 함께라면 평생을 함께할 동반자가 될 것입니다.`;
            pastLifeText = `전생에 서로의 고단한 마음을 보듬어주던 <b>오랜 벗</b>이었던 두 사람. 이번 생에도 서로의 아픔을 치유해주며 영혼의 안식처가 되어줄 것입니다.`;
        } else if (isHighP1 || isHighP2) {
            compatibilityText = `<b><span class="text-blue-400">🤝 서로를 챙겨주는 궁합 🤝</span></b><br>한 명이 리드하면 다른 한 명이 따르는 완벽한 균형!<br>서로의 마음을 깊이 이해하고 배려하는 따뜻한 관계가 될 것입니다.`;
            pastLifeText = `전생에 <b>길 잃은 두 여행자</b>였던 두 사람. 힘든 여정 속에서 서로를 지탱해주었듯, 이번 생에도 서로의 버팀목이 되어줄 것입니다.`;
        } else {
            compatibilityText = `<b><span class="text-green-400">🌱 풋풋한 힐링 궁합 🌱</span></b><br>서로의 감정을 섬세하게 공유하며 안정감을 느낄 수 있는 관계입니다.<br>소소한 행복을 함께 나누며 성장하는 아름다운 사랑을 만들 수 있어요.`;
            pastLifeText = `전생에 같은 공간의 <b>작은 새와 토끼</b>였던 두 사람. 서로의 존재를 알아차리고 조용히 행복을 누렸듯, 이번 생에는 소박하고 아기자기한 행복을 만들어갈 것입니다.`;
        }
    }
    else if ((p1IsTeto && p2IsEgen) || (p1IsEgen && p2IsTeto)) {
        if (isVeryHighP1 && isVeryHighP2) {
            compatibilityText = `<b><span class="text-purple-400">🔮 운명처럼 끌리는 궁합 🔮</span></b><br>강렬한 카리스마와 순수한 매력이 만나<br>서로에게 없어서는 안 될 존재가 될 것입니다. 드라마 같은 사랑이 시작될 거예요!`;
            pastLifeText = `전생에 <b>용맹한 장군과 곤경에 빠진 공주</b>였던 두 사람. 한 명은 다른 한 명을 지키기 위해 모든 것을 바쳤고, 다른 한 명은 그에게 모든 것을 내어주었듯, 이번 생에도 서로에게 가장 소중한 존재가 될 것입니다.`;
        } else if (isHighP1 || isHighP2) {
            compatibilityText = `<b><span class="text-pink-400">🌷 서로의 빈틈을 채워주는 궁합 🌷</span></b><br>한 사람의 확고한 추진력이 다른 사람의 섬세함을 만나<br>가장 이상적인 관계를 형성합니다. 서로에게 부족한 부분을 채워주며 시너지를 발휘할 거예요.`;
            pastLifeText = `전생에 <b>마님과 충직한 집사</b>였던 두 사람. 모든 것을 책임지는 마님과 뒤에서 묵묵히 보좌하는 집사였듯, 이번 생에는 서로를 믿고 의지하며 모든 어려움을 함께 헤쳐나갈 것입니다.`;
        } else {
            compatibilityText = `<b><span class="text-gray-400">🤍 담백하고 안정적인 궁합 🤍</span></b><br>서로 다른 성향이지만, 그 차이를 인정하고 이해하는<br>성숙한 관계입니다. 큰 사건 없이 평온하고 행복한 사랑을 이어나갈 수 있어요.`;
            pastLifeText = `전생에 <b>고양이와 강아지</b>였던 두 사람. 항상 투닥거렸지만 서로에게 없어서는 안 될 존재였듯, 이번 생에는 평생의 동반자로 함께할 것입니다.`;
        }
    }
    
    return { compatibility: compatibilityText, pastLife: pastLifeText };
}

function showCoupleResultScreen() {
    showScreen('coupleResult');

    const p1Result = coupleTestState.player1.result;
    const p1Img = new Image();
    p1Img.src = coupleTestState.player1.image.toDataURL ? coupleTestState.player1.image.toDataURL('image/jpeg') : coupleTestState.player1.image.src;
    p1Img.classList.add('w-full', 'h-full', 'object-cover');
    p1Img.style.transform = 'scaleX(-1)';
    p1Img.alt = `플레이어 1의 분석 결과 이미지: ${p1Result.className}`; // 이 줄을 추가합니다.
    player1ResultImage.innerHTML = '';
    player1ResultImage.appendChild(p1Img);
    player1ResultInfo.innerHTML = `
        <div class="class-prediction mt-2">
            <span class="text-lg font-bold">${p1Result.className}</span>
            <span class="text-gray-400 font-mono">${(p1Result.probability * 100).toFixed(1)}%</span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2.5 mt-2">
            <div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${(p1Result.probability * 100).toFixed(1)}%"></div>
        </div>
    `;
    
    const p2Result = coupleTestState.player2.result;
    const p2Img = new Image();
    p2Img.src = coupleTestState.player2.image.toDataURL ? coupleTestState.player2.image.toDataURL('image/jpeg') : coupleTestState.player2.image.src;
    p2Img.classList.add('w-full', 'h-full', 'object-cover');
    p2Img.style.transform = 'scaleX(-1)';
    p2Img.alt = `플레이어 2의 분석 결과 이미지: ${p2Result.className}`; // 이 줄을 추가합니다.
    player2ResultImage.innerHTML = '';
    player2ResultImage.appendChild(p2Img);
    player2ResultInfo.innerHTML = `
        <div class="class-prediction mt-2">
            <span class="text-lg font-bold">${p2Result.className}</span>
            <span class="text-gray-400 font-mono">${(p2Result.probability * 100).toFixed(1)}%</span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2.5 mt-2">
            <div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${(p2Result.probability * 100).toFixed(1)}%"></div>
        </div>
    `;

    const resultTexts = getCoupleResultText(p1Result, p2Result);
    coupleMatchText.innerHTML = resultTexts.compatibility;
    couplePastLifeText.innerHTML = resultTexts.pastLife;
    
    loadingUi.classList.add('hidden');
}

function resetTest() {
    if (webcam && webcam.running) {
        webcam.stop();
    }
    if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
    }
    webcamContainer.innerHTML = '';
    resultImageContainer.innerHTML = '';
    resultContainer.innerHTML = '';
    resultDescriptionContainer.innerHTML = '';
    currentResult = { type: '', prob: 0 };
    fileUploadInput.value = '';

    coupleTestState.player1.image = null;
    coupleTestState.player1.result = null;
    coupleTestState.player2.image = null;
    coupleTestState.player2.result = null;
    player1ImageContainer.innerHTML = '<i class="fa-solid fa-camera text-4xl"></i>';
    player1ImageContainer.classList.add('flex');
    player2ImageContainer.innerHTML = '<i class="fa-solid fa-camera text-4xl"></i>';
    player2ImageContainer.classList.add('flex');
    player1FileInput.value = '';
    player2FileInput.value = '';
    updateCoupleTestButton();

    testModeMain.classList.remove('hidden'); 
    loadingUi.classList.add('hidden');
    
    showScreen('initial');
}

fileUploadInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
            return;
    }
    if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            fileUploadInput.value = '';
            return;
    }
    
    showScreen('testMode');
    testModeMain.classList.add('hidden');
    loadingUi.classList.remove('hidden');
    loadingText.textContent = '사진을 분석하고 있습니다...';

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            showResultScreenAndPredict(canvas);
            loadingUi.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

function shareToSNS(platform) {
    const shareUrl = window.location.href;
    let shareText = '';
    
    if (currentMode === 'couple' && typeof coupleTestState !== 'undefined' && coupleTestState.player1 && coupleTestState.player2) {
        const p1Result = coupleTestState.player1.result;
        const p2Result = coupleTestState.player2.result;
        shareText = `[AI 궁합 테스트] 저희는 ${p1Result.className} & ${p2Result.className} 조합이래요! 저희 궁합 결과는 과연?! 당신의 궁합도 확인해보세요!`;
    } else if (currentMode === 'single') {
        shareText = `[AI 얼굴상 분석] 제 분석 결과는 '${currentResult.prob}% 확률로 ${currentResult.type}' 입니다! 당신의 얼굴상도 확인해보세요!`;
    } else {
        shareText = `AI 얼굴상 분석기로 나의 얼굴상과 궁합을 확인해보세요!`;
    }

    let url = '';
    switch(platform) {
        case 'kakao':
            Kakao.Link.sendDefault({
                objectType: 'feed',
                content: {
                    title: 'AI 얼굴상 분석기',
                    description: shareText,
                    imageUrl: 'https://projectresolutionsoffice.github.io/web.ai-face/icon/Icon.png',
                    link: {
                        mobileWebUrl: shareUrl,
                        webUrl: shareUrl
                    }
                },
                buttons: [
                    {
                        title: '자세히 보기',
                        link: {
                            mobileWebUrl: shareUrl,
                            webUrl: shareUrl
                        }
                    }
                ]
            });
            break;
        case 'twitter':
            url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
            window.open(url, '_blank');
            break;
        case 'facebook':
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            window.open(url, '_blank');
            break;
        case 'copy':
            navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
                alert('결과가 클립보드에 복사되었습니다!');
            }, () => {
                alert('복사에 실패했습니다.');
            });
            break;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    showScreen('initial');
});