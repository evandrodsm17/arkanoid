// --- Configuração Inicial ---
const canvas = document.getElementById("arkanoidCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("start-button");
const mobileControls = document.getElementById("mobile-controls");
const leftButton = document.getElementById("left-button");
const rightButton = document.getElementById("right-button");

let gameLoopId;
let lives = 3;
let score = 0;
let level = 1;
let gamePaused = true;
let ballLaunched = false;

// --- Cores para os blocos (para variar) ---
// Adicionando tons mais escuros para o efeito 3D (para gradientes)
const brickColorPalettes = [
    { light: "#e74c3c", dark: "#c0392b" }, // Red
    { light: "#f39c12", dark: "#e67e22" }, // Orange
    { light: "#2ecc71", dark: "#27ae60" }, // Green
    { light: "#3498db", dark: "#2980b9" }, // Blue
    { light: "#9b59b6", dark: "#8e44ad" }, // Purple
    { light: "#1abc9c", dark: "#16a085" }, // Turquoise
    { light: "#d35400", dark: "#c0392b" }  // Dark Orange
];

// Função para obter uma cor aleatória (agora retorna um objeto light/dark)
function getRandomBrickColorPalette() {
    return brickColorPalettes[Math.floor(Math.random() * brickColorPalettes.length)];
}

// --- Objeto Paleta (Paddle) ---
const paddle = {
    height: 12, // Um pouco mais alta
    width: 75,
    x: 0,
    dx: 7,
    movingRight: false,
    movingLeft: false,
    // Cor base, o gradiente será gerado dinamicamente
    colorLight: "#3498db",
    colorDark: "#2980b9"
};

// --- Objeto Bola (Ball) ---
const ballDefaults = {
    radius: 6, // Um pouco maior
    dx: 3,
    dy: -3,
    // Cor base, o gradiente será gerado dinamicamente
    colorLight: "#e74c3c",
    colorDark: "#c0392b"
};

let balls = [];

// --- Blocos (Bricks) e Níveis ---
const brick = {
    height: 22, // Um pouco mais alto
    padding: 8,
    offsetTop: 40,
    offsetLeft: 20,
    width: 0
};

const levels = [
    // Nível 1
    [
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1]
    ],
    // Nível 2 (Exemplo com bloco especial: 2 = Multi-Bola)
    [
        [1, 2, 1, 2, 1, 2, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 2, 1, 2, 1, 2, 1],
        [1, 1, 1, 1, 1, 1, 1]
    ]
];

let bricks = [];

// --- Funções de Responsividade e Inicialização ---
function resizeCanvas() {
    const minWidth = 320;
    const maxWidth = 800;
    const idealHeightRatio = 1.3;

    let newWidth = window.innerWidth * 0.9;
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

    canvas.width = newWidth;
    canvas.height = newWidth * idealHeightRatio;

    paddle.width = Math.max(50, canvas.width / 8);

    resetPaddleAndBallPosition();

    if (levels[level - 1]) {
        createBricks(levels[level - 1]);
    }

    if (gamePaused && (lives <= 0 || level > levels.length)) {
        drawGameOverScreen();
    }
}

function resetPaddleAndBallPosition() {
    paddle.x = (canvas.width - paddle.width) / 2;
    balls = [Object.assign({}, ballDefaults, {
        x: paddle.x + paddle.width / 2,
        y: canvas.height - paddle.height - ballDefaults.radius - 15, // Mais acima para efeito 3D
        dx: ballDefaults.dx,
        dy: ballDefaults.dy
    })];
    ballLaunched = false;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createBricks(levelData) {
    bricks = [];
    const colCount = levelData[0].length;
    const rowCount = levelData.length;

    const totalHorizontalPadding = brick.offsetLeft * 2 + (colCount - 1) * brick.padding;
    brick.width = Math.floor((canvas.width - totalHorizontalPadding) / colCount);

    for (let c = 0; c < colCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < rowCount; r++) {
            if (levelData[r][c] > 0) {
                bricks[c][r] = {
                    x: (c * (brick.width + brick.padding)) + brick.offsetLeft,
                    y: (r * (brick.height + brick.padding)) + brick.offsetTop,
                    status: levelData[r][c],
                    colorPalette: getRandomBrickColorPalette() // Armazena a paleta de cores
                };
            }
        }
    }
}

createBricks(levels[level - 1]);
resetPaddleAndBallPosition();

// --- Funções de Desenho com Estilo 3D ---

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddle.x, canvas.height - paddle.height - 10, paddle.width, paddle.height);

    // Gradiente para a paleta
    const gradient = ctx.createLinearGradient(paddle.x, canvas.height - paddle.height - 10, paddle.x, canvas.height - 10);
    gradient.addColorStop(0, paddle.colorLight);
    gradient.addColorStop(1, paddle.colorDark);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Sombra para a paleta (efeito 3D)
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fill(); // Preenche novamente para aplicar a sombra

    ctx.closePath();

    // Resetar sombras para outros elementos
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawBall(b) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

    // Gradiente radial para a bola (esfera)
    const gradient = ctx.createRadialGradient(
        b.x - b.radius / 3, b.y - b.radius / 3, b.radius / 4, // Ponto de luz
        b.x, b.y, b.radius // Centro da bola
    );
    gradient.addColorStop(0, "white"); // Ponto de brilho
    gradient.addColorStop(0.2, ballDefaults.colorLight);
    gradient.addColorStop(1, ballDefaults.colorDark);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Sombra para a bola
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fill(); // Preenche novamente para aplicar a sombra

    ctx.closePath();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawBricks() {
    for (let c = 0; c < bricks.length; c++) {
        for (let r = 0; r < bricks[c].length; r++) {
            const b = bricks[c][r];
            if (b && b.status > 0) {
                ctx.beginPath();
                ctx.rect(b.x, b.y, brick.width, brick.height);

                // Gradiente para os blocos
                const gradient = ctx.createLinearGradient(b.x, b.y, b.x, b.y + brick.height);
                gradient.addColorStop(0, b.colorPalette.light);
                gradient.addColorStop(1, b.colorPalette.dark);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Borda para os blocos (para separá-los)
                ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"; // Borda escura suave
                ctx.lineWidth = 2;
                ctx.stroke();

                // Sombra para os blocos
                ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.fill(); // Preenche novamente para aplicar a sombra

                ctx.closePath();

                // Resetar sombras para outros elementos
                ctx.shadowColor = "transparent";
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                // Desenha um ícone se for um bloco especial
                if (b.status === 2) {
                    ctx.font = "14px 'Press Start 2P'";
                    ctx.fillStyle = "white";
                    ctx.textAlign = "center";
                    ctx.fillText("?", b.x + brick.width / 2, b.y + brick.height / 2 + 6);
                }
            }
        }
    }
}

function drawInfo() {
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#ecf0f1";
    ctx.textAlign = "left";
    ctx.fillText("Score: " + score, 10, 25);
    ctx.textAlign = "center";
    ctx.fillText("Level: " + level, canvas.width / 2, 25);
    ctx.textAlign = "right";
    ctx.fillText("Lives: " + lives, canvas.width - 10, 25);
}

// --- Funções de Movimento e Colisão (sem alterações significativas) ---

function movePaddle() {
    if (paddle.movingRight && paddle.x < canvas.width - paddle.width) {
        paddle.x += paddle.dx;
    } else if (paddle.movingLeft && paddle.x > 0) {
        paddle.x -= paddle.dx;
    }
}

function moveBall(b) {
    if (!ballLaunched) {
        b.x = paddle.x + paddle.width / 2;
        b.y = canvas.height - paddle.height - b.radius - 15;
        return;
    }

    b.x += b.dx;
    b.y += b.dy;

    if (b.x + b.radius > canvas.width || b.x - b.radius < 0) {
        b.dx = -b.dx;
    }
    if (b.y - b.radius < 0) {
        b.dy = -b.dy;
    }

    if (b.y + b.radius > canvas.height) {
        balls.splice(balls.indexOf(b), 1);
        if (balls.length === 0) {
            lives--;
            if (lives <= 0) {
                gameOver("Game Over!");
                return;
            }
            resetPaddleAndBallPosition();
            gamePaused = true;
            startButton.textContent = "Continuar";
            startButton.style.display = 'block';
        }
        return;
    }

    if (b.y + b.radius > canvas.height - paddle.height - 10 &&
        b.y + b.radius < canvas.height - 10 + b.radius / 2 &&
        b.x > paddle.x &&
        b.x < paddle.x + paddle.width) {

        b.dy = -b.dy;
        const relativeIntersectX = (paddle.x + (paddle.width / 2)) - b.x;
        const normalizedRelativeIntersectionX = (relativeIntersectX / (paddle.width / 2));
        b.dx = normalizedRelativeIntersectionX * -ballDefaults.dx * 1.5;
    }
}

function collisionDetection() {
    for (let c = 0; c < bricks.length; c++) {
        for (let r = 0; r < bricks[c].length; r++) {
            const b = bricks[c][r];
            if (b && b.status > 0) {
                balls.forEach(ballInstance => {
                    if (ballInstance.x + ballInstance.radius > b.x &&
                        ballInstance.x - ballInstance.radius < b.x + brick.width &&
                        ballInstance.y + ballInstance.radius > b.y &&
                        ballInstance.y - ballInstance.radius < b.y + brick.height) {

                        const prevBallX = ballInstance.x - ballInstance.dx;
                        const prevBallY = ballInstance.y - ballInstance.dy;

                        if (prevBallY + ballInstance.radius <= b.y || prevBallY - ballInstance.radius >= b.y + brick.height) {
                            ballInstance.dy = -ballInstance.dy;
                        } else {
                            ballInstance.dx = -ballInstance.dx;
                        }

                        if (b.status === 2) {
                            activateSpecialBlock(ballInstance);
                        }

                        b.status = 0;
                        score += 10;
                        checkLevelComplete();
                    }
                });
            }
        }
    }
}

function activateSpecialBlock(originBall) {
    const newBall1 = Object.assign({}, ballDefaults, {
        x: originBall.x,
        y: originBall.y,
        dx: -originBall.dx,
        dy: originBall.dy
    });
    const newBall2 = Object.assign({}, ballDefaults, {
        x: originBall.x,
        y: originBall.y,
        dx: originBall.dx,
        dy: -originBall.dy
    });
    balls.push(newBall1, newBall2);
}

function checkLevelComplete() {
    const remainingBricks = bricks.flat().filter(b => b && b.status > 0).length;
    if (remainingBricks === 0) {
        level++;
        if (level > levels.length) {
            gameOver("Você Venceu!");
            return;
        }

        createBricks(levels[level - 1]);
        resetPaddleAndBallPosition();
        gamePaused = true;
        startButton.textContent = `Iniciar Nível ${level}`;
        startButton.style.display = 'block';
    }
}

function drawGameOverScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "30px 'Press Start 2P'";
    ctx.fillStyle = "#ecf0f1";
    ctx.textAlign = "center";
    const message = (lives <= 0) ? "Game Over!" : "Você Venceu!";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillText("Final Score: " + score, canvas.width / 2, canvas.height / 2 + 20);
}


function gameOver(message) {
    cancelAnimationFrame(gameLoopId);
    gamePaused = true;
    startButton.textContent = "Jogar Novamente";
    startButton.style.display = 'block';
    drawGameOverScreen();

    startButton.onclick = () => {
        document.location.reload();
    };
}

// --- Loop Principal do Jogo (Game Loop) ---

function draw() {
    if (gamePaused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBricks();
    drawPaddle();
    drawInfo();

    movePaddle();
    collisionDetection();

    balls.forEach(b => {
        moveBall(b);
        drawBall(b);
    });

    gameLoopId = requestAnimationFrame(draw);
}

// --- Eventos de Controle (Desktop e Mobile) ---

document.addEventListener("keydown", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") {
        paddle.movingRight = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        paddle.movingLeft = true;
    }
    // Lançar a bola com espaço ou seta para cima
    if ((e.key === " " || e.key === "ArrowUp") && gamePaused && !ballLaunched) {
        ballLaunched = true;
        gamePaused = false;
        startButton.style.display = 'none';
        draw();
    }
});

document.addEventListener("keyup", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") {
        paddle.movingRight = false;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        paddle.movingLeft = false;
    }
});

// Botão Esquerda
leftButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); 
    paddle.movingLeft = true;
    paddle.movingRight = false; // Garante que apenas um direcional esteja ativo
});
leftButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    paddle.movingLeft = false;
});
leftButton.addEventListener('touchcancel', (e) => { // Importante para quando o toque é interrompido
    e.preventDefault();
    paddle.movingLeft = false;
});

// Botão Direita
rightButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    paddle.movingRight = true;
    paddle.movingLeft = false; // Garante que apenas um direcional esteja ativo
});
rightButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    paddle.movingRight = false;
});
rightButton.addEventListener('touchcancel', (e) => { // Importante para quando o toque é interrompido
    e.preventDefault();
    paddle.movingRight = false;
});

startButton.onclick = () => {
    if (gamePaused) {
        gamePaused = false;
        startButton.style.display = 'none';
        if (!ballLaunched) {
            ballLaunched = true;
        }
        draw();
    }
};