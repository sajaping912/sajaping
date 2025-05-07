// 게임 상태 관리
const gameState = {
    started: false,
    over: false,
    paused: false,   // 일시정지 상태 추가
    score: 0,
    lives: 3,
    level: 1,
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    lastTime: 0,
    enemySpawnTimer: 0,
    enemyShootTimer: 0,
    gameTimer: 0,           // 게임 시간 타이머 추가
    gameTimeLimit: 60000    // 1분 = 60,000 밀리초
};

// 게임 설정
const gameSettings = {
    canvasWidth: 0,
    canvasHeight: 0,
    playerSpeed: 5,
    bulletSpeed: 10,
    enemySpeed: 2,
    enemySpawnInterval: 2000, // 2초마다 적 생성
    enemyShootInterval: 1500, // 1.5초마다 적이 총알 발사
    touchActive: false,
    touchDirection: 0, // -1: 왼쪽, 0: 정지, 1: 오른쪽
    isShooting: false
};

// 게임 오브젝트
let player = {
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    speed: 5,
    image: null
};

// DOM 요소
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');

// 오디오 요소
const bgMusic = new Audio('sounds/background.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;

const shootSound = new Audio('sounds/shoot.mp3');
shootSound.volume = 0.3;

const explosionSound = new Audio('sounds/explosion.mp3');
explosionSound.volume = 0.4;

// 이미지 로딩
function loadImages() {
    player.image = new Image();
    player.image.src = 'images/player.png';
    
    // 적 이미지는 게임 시작 시 로드됩니다
}

// 게임 초기화
function init() {
    resizeCanvas();
    loadImages();
    
    // 플레이어 초기 위치 설정
    player.x = (gameSettings.canvasWidth - player.width) / 2;
    player.y = gameSettings.canvasHeight - player.height - 20;
    
    // 이벤트 리스너 등록
    window.addEventListener('resize', resizeCanvas);
    
    // 공통 터치 핸들러 함수
    function addGameButtonHandler(element, callback) {
        // 터치 이벤트 (모바일)
        element.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`${element.id} 터치됨`);
            if (callback) callback();
        }, {passive: false});
        
        // 클릭 이벤트 (PC)
        element.addEventListener('click', function(e) {
            console.log(`${element.id} 클릭됨`);
            if (callback) callback();
        });
        
        // 마우스 이벤트 추가 (추가 지원)
        element.addEventListener('mousedown', function(e) {
            console.log(`${element.id} 마우스 다운`);
            if (callback) callback();
        });
    }
    
    // 게임 시작 버튼에 이벤트 핸들러 추가
    addGameButtonHandler(startButton, startGame);
    
    // 게임 재시작 버튼에 이벤트 핸들러 추가
    addGameButtonHandler(restartButton, restartGame);
    
    // 버튼 스타일 개선 (터치 가능성 향상)
    startButton.style.cursor = 'pointer';
    restartButton.style.cursor = 'pointer';
    
    // 캔버스에 터치 이벤트 추가
    setupCanvasTouchHandler();
    
    // 키보드 이벤트 설정 (디버깅 용도)
    setupKeyboardControls();
    
    // 디버깅용 콘솔 로그
    console.log("게임 초기화 완료");
}

// 캔버스 크기 조정
function resizeCanvas() {
    const container = document.getElementById('game-container');
    gameSettings.canvasWidth = container.clientWidth;
    gameSettings.canvasHeight = container.clientHeight;
    
    canvas.width = gameSettings.canvasWidth;
    canvas.height = gameSettings.canvasHeight;
    
    if (player.image) {
        // 플레이어 위치 재설정
        player.x = (gameSettings.canvasWidth - player.width) / 2;
        player.y = gameSettings.canvasHeight - player.height - 20;
    }
}

// 캔버스 터치 이벤트 설정
function setupCanvasTouchHandler() {
    canvas.addEventListener('touchstart', function(e) {
        if (!gameState.started || gameState.over) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        
        // 터치 지점의 좌표 계산
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        console.log('캔버스 터치 감지:', touchX, touchY);
        
        // 플레이어를 터치 지점 위에 위치시키기
        // x축 왼쪽으로 추가 3px 더 이동 (총 11px)
        player.x = touchX - player.width / 2 - 11; // 왼쪽으로 총 11px 이동
        player.y = touchY - player.height - 10 - 8; // 위쪽으로 총 18px 이동
        
        // 화면 경계 체크
        if (player.x < 0) player.x = 0;
        if (player.x > gameSettings.canvasWidth - player.width) {
            player.x = gameSettings.canvasWidth - player.width;
        }
        
        if (player.y < 0) player.y = 0;
        if (player.y > gameSettings.canvasHeight - player.height) {
            player.y = gameSettings.canvasHeight - player.height;
        }
        
        // 총알 발사
        shootBullet();
    }, {passive: false});
    
    // PC 사용자를 위한 클릭 이벤트도 추가
    canvas.addEventListener('click', function(e) {
        if (!gameState.started || gameState.over) return;
        
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        console.log('캔버스 클릭 감지:', clickX, clickY);
        
        // 플레이어를 클릭 지점 위에 위치시키기
        // x축 왼쪽으로 추가 3px 더 이동 (총 11px)
        player.x = clickX - player.width / 2 - 11; // 왼쪽으로 총 11px 이동
        player.y = clickY - player.height - 10 - 8; // 위쪽으로 총 18px 이동
        
        // 화면 경계 체크
        if (player.x < 0) player.x = 0;
        if (player.x > gameSettings.canvasWidth - player.width) {
            player.x = gameSettings.canvasWidth - player.width;
        }
        
        if (player.y < 0) player.y = 0;
        if (player.y > gameSettings.canvasHeight - player.height) {
            player.y = gameSettings.canvasHeight - player.height;
        }
        
        // 총알 발사
        shootBullet();
    });
}

// 키보드 컨트롤 설정 (디버깅 용도)
function setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            gameSettings.touchDirection = -1;
            gameSettings.touchActive = true;
        } else if (e.key === 'ArrowRight') {
            gameSettings.touchDirection = 1;
            gameSettings.touchActive = true;
        } else if (e.key === ' ' || e.key === 'ArrowUp') {
            gameSettings.isShooting = true;
            shootBullet();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            gameSettings.touchActive = false;
            gameSettings.touchDirection = 0;
        } else if (e.key === ' ' || e.key === 'ArrowUp') {
            gameSettings.isShooting = false;
        }
    });
}

// 게임 시작
function startGame() {
    gameState.started = true;
    gameState.over = false;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.enemies = [];
    gameState.playerBullets = [];
    gameState.enemyBullets = [];
    gameState.gameTimer = 0; // 게임 타이머 초기화
    
    startScreen.classList.add('hidden');
    scoreDisplay.textContent = '0';
    
    // 오디오 처리 개선
    try {
        bgMusic.currentTime = 0;
        const playPromise = bgMusic.play();
        
        // 오디오 재생 약속 처리
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("오디오 자동 재생이 차단되었습니다:", error);
                // 사용자가 화면을 터치할 때 오디오 재생 활성화
                document.addEventListener('touchstart', function audioUnlock() {
                    bgMusic.play();
                    document.removeEventListener('touchstart', audioUnlock);
                }, { once: true });
            });
        }
    } catch (e) {
        console.log("오디오 재생 오류:", e);
    }
    
    requestAnimationFrame(gameLoop);
}

// 게임 재시작
function restartGame() {
    gameOverScreen.classList.add('hidden');
    startGame();
}

// 총알 발사
function shootBullet() {
    if (!gameState.started || gameState.over) return;
    
    const bulletWidth = 5;
    const bulletHeight = 15;
    
    const bullet = {
        x: player.x + (player.width - bulletWidth) / 2,
        y: player.y - bulletHeight,
        width: bulletWidth,
        height: bulletHeight,
        speed: gameSettings.bulletSpeed
    };
    
    gameState.playerBullets.push(bullet);
    
    // 오디오 처리 개선
    try {
        shootSound.currentTime = 0;
        shootSound.play().catch(error => {
            console.log("발사 사운드 재생 오류:", error);
        });
    } catch (e) {
        console.log("발사 사운드 오류:", e);
    }
}

// 적 생성
function spawnEnemy() {
    // 다양한 적 타입 설정 (첨부한 이미지 활용)
    const enemyTypes = [
        { image: 'enemy1.png', width: 50, height: 50, points: 10, speed: 1.5 },   // 우주선
        { image: 'enemy2.png', width: 50, height: 50, points: 20, speed: 2 },     // 또 다른 우주선
        { image: 'enemy3.png', width: 40, height: 40, points: 30, speed: 2.5 },   // 또 다른 우주선
        { image: 'enemy4.png', width: 55, height: 35, points: 40, speed: 3 },     // 잠자리
        { image: 'enemy5.png', width: 50, height: 50, points: 50, speed: 1.8 },   // 벌
        { image: 'enemy6.png', width: 40, height: 40, points: 60, speed: 2.2 },   // 나뭇잎
        { image: 'enemy7.png', width: 55, height: 35, points: 70, speed: 4 },     // 물고기
        { image: 'enemy8.png', width: 60, height: 25, points: 80, speed: 3.5 },   // 독수리
        { image: 'enemy9.png', width: 60, height: 30, points: 90, speed: 1.5 },   // 또 다른 독수리
        { image: 'enemy10.png', width: 40, height: 70, points: 100, speed: 2 }    // 로켓
    ];
    
    // 랜덤으로 적 타입 선택
    const typeIndex = Math.floor(Math.random() * enemyTypes.length);
    const type = enemyTypes[typeIndex];
    
    // 적 객체 생성
    const enemy = {
        x: Math.random() * (gameSettings.canvasWidth - type.width),
        y: -type.height,
        width: type.width,
        height: type.height,
        speed: type.speed * (1 + gameState.level * 0.1), // 레벨이 올라갈수록 속도 증가
        points: type.points,
        image: new Image()
    };
    
    // 이미지 로드 및 적 추가
    enemy.image.src = `images/${type.image}`;
    enemy.image.onload = function() {
        console.log(`적 이미지 로드 완료: ${type.image}`);
    };
    
    gameState.enemies.push(enemy);
    
    // 디버깅 정보
    console.log(`새로운 적 생성: ${type.image} (포인트: ${type.points})`);
}

// 적 총알 발사
function enemyShoot() {
    if (gameState.enemies.length === 0) return;
    
    const shootingEnemy = gameState.enemies[Math.floor(Math.random() * gameState.enemies.length)];
    
    const bullet = {
        x: shootingEnemy.x + shootingEnemy.width / 2 - 2,
        y: shootingEnemy.y + shootingEnemy.height,
        width: 4,
        height: 10,
        speed: gameSettings.bulletSpeed / 2
    };
    
    gameState.enemyBullets.push(bullet);
}

// 충돌 감지
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// 게임 업데이트 로직
function update(deltaTime) {
    if (!gameState.started || gameState.over || gameState.paused) return;
    
    // 플레이어 이동
    if (gameSettings.touchActive) {
        player.x += gameSettings.touchDirection * player.speed;
        
        // 화면 경계 체크
        if (player.x < 0) player.x = 0;
        if (player.x > gameSettings.canvasWidth - player.width) {
            player.x = gameSettings.canvasWidth - player.width;
        }
    }
    
    // 적 스폰 타이머
    gameState.enemySpawnTimer += deltaTime;
    if (gameState.enemySpawnTimer >= gameSettings.enemySpawnInterval) {
        spawnEnemy();
        gameState.enemySpawnTimer = 0;
    }
    
    // 적 총알 발사 타이머
    gameState.enemyShootTimer += deltaTime;
    if (gameState.enemyShootTimer >= gameSettings.enemyShootInterval) {
        enemyShoot();
        gameState.enemyShootTimer = 0;
    }
    
    // 게임 타이머 업데이트 - 1분(60,000ms) 후에 게임 종료
    gameState.gameTimer += deltaTime;
    if (gameState.gameTimer >= gameState.gameTimeLimit) {
        endGame();
        return; // 게임 종료 후 추가 업데이트 방지
    }
    
    // 적 이동
    gameState.enemies.forEach((enemy, index) => {
        enemy.y += enemy.speed;
        
        // 화면 밖으로 나간 적 제거
        if (enemy.y > gameSettings.canvasHeight) {
            gameState.enemies.splice(index, 1);
        }
    });
    
    // 플레이어 총알 이동
    gameState.playerBullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        
        // 화면 밖으로 나간 총알 제거
        if (bullet.y < 0) {
            gameState.playerBullets.splice(index, 1);
        }
    });
    
    // 적 총알 이동
    gameState.enemyBullets.forEach((bullet, index) => {
        bullet.y += bullet.speed;
        
        // 화면 밖으로 나간 총알 제거
        if (bullet.y > gameSettings.canvasHeight) {
            gameState.enemyBullets.splice(index, 1);
        }
    });
    
    // 충돌 검사
    // 플레이어 총알과 적 충돌
    for (let i = gameState.playerBullets.length - 1; i >= 0; i--) {
        const bullet = gameState.playerBullets[i];
        
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            const enemy = gameState.enemies[j];
            
            if (checkCollision(bullet, enemy)) {
                // 점수 증가
                gameState.score += enemy.points;
                scoreDisplay.textContent = gameState.score;
                
                // 충돌한 개체 제거
                gameState.playerBullets.splice(i, 1);
                gameState.enemies.splice(j, 1);
                
                // 폭발 효과음
                explosionSound.currentTime = 0;
                explosionSound.play();
                
                break;
            }
        }
    }
    
    // 적 총알과 플레이어 충돌 - 피해를 입지만 게임은 계속됨
    for (let i = gameState.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = gameState.enemyBullets[i];
        
        if (checkCollision(bullet, player)) {
            // 총알 제거
            gameState.enemyBullets.splice(i, 1);
            
            // 폭발 효과음만 재생
            explosionSound.currentTime = 0;
            explosionSound.play();
            
            break;
        }
    }
    
    // 적과 플레이어 충돌 - 적만 제거하고 게임은 계속됨
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        
        if (checkCollision(enemy, player)) {
            // 적 제거
            gameState.enemies.splice(i, 1);
            
            // 폭발 효과음만 재생
            explosionSound.currentTime = 0;
            explosionSound.play();
        }
    }
}

// 게임 랜더링
function render() {
    // 캔버스 지우기
    ctx.clearRect(0, 0, gameSettings.canvasWidth, gameSettings.canvasHeight);
    
    // 배경 (간단한 우주 배경)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, gameSettings.canvasWidth, gameSettings.canvasHeight);
    
    if (!gameState.started) return;
    
    // 플레이어 그리기
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
    
    // 적 그리기
    gameState.enemies.forEach(enemy => {
        ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);
    });
    
    // 플레이어 총알 그리기
    ctx.fillStyle = '#fff';
    gameState.playerBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // 적 총알 그리기
    ctx.fillStyle = '#ff0';
    gameState.enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // 남은 시간 업데이트 (상단 메뉴의 타이머 요소)
    if (gameState.started && !gameState.over) {
        const remainingSeconds = Math.ceil((gameState.gameTimeLimit - gameState.gameTimer) / 1000);
        document.getElementById('timer-display').textContent = `${remainingSeconds}`;
    }
}

// 게임 오버
function endGame() {
    gameState.over = true;
    bgMusic.pause();
    
    finalScoreDisplay.textContent = gameState.score;
    gameOverScreen.classList.remove('hidden');
}

// 메인 게임 루프
function gameLoop(timestamp) {
    if (gameState.paused) {
        // 일시정지된 경우 타임스탬프를 업데이트하지 않고 렌더링만 유지
        render();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    const deltaTime = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;
    
    update(deltaTime);
    render();
    
    if (gameState.started && !gameState.over) {
        requestAnimationFrame(gameLoop);
    }
}

// 게임 일시정지
function pauseGame() {
    gameState.paused = true;
    bgMusic.pause();
}

// 게임 재개
function resumeGame() {
    gameState.paused = false;
    bgMusic.play();
    requestAnimationFrame(gameLoop);
}

// 게임 중지
function stopGame() {
    gameState.started = false;
    gameState.over = true;
    bgMusic.pause();
}

// 페이지 로드 시 초기화
window.addEventListener('load', function() {
    init();
    
    // 상단 메뉴 기능 구현
    const startMenuBtn = document.getElementById('menu-start');
    const pauseMenuBtn = document.getElementById('menu-pause');
    const stopMenuBtn = document.getElementById('menu-stop');
    
    startMenuBtn.addEventListener('click', function() {
        if (gameState.over || !gameState.started) {
            startGame();
        }
    });
    
    pauseMenuBtn.addEventListener('click', function() {
        if (gameState.started && !gameState.over) {
            if (gameState.paused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
    });
    
    stopMenuBtn.addEventListener('click', function() {
        if (gameState.started) {
            stopGame();
        }
    });
    
    // 터치 이벤트도 추가
    startMenuBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (gameState.over || !gameState.started) {
            startGame();
        }
    });
    
    pauseMenuBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (gameState.started && !gameState.over) {
            if (gameState.paused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
    });
    
    stopMenuBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (gameState.started) {
            stopGame();
        }
    });
});