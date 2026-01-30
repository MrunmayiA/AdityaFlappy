const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let currentState = 'START'; // START, PLAYING, GAMEOVER, WIN
let frames = 0;
const DEGREE = Math.PI / 180;

// Assets
const birdImg = document.getElementById('bird-img');
const wallImg = document.getElementById('wall-img');
const winnerImg = document.getElementById('winner-display-img'); // Using the winner image for the pillar too
const bgMusic = document.getElementById('bg-music');
const hitSound = document.getElementById('hit-sound');
const winSound = document.getElementById('win-sound');

// Volume Control
bgMusic.volume = 0.3;
winSound.volume = 0.5;

// Game Variables
let score = 0;
const WIN_SCORE = 3;
let difficultyMultiplier = 1;

// Input Handling
document.addEventListener('keydown', function (evt) {
    if (evt.code === 'Space') {
        action();
    }
});
canvas.addEventListener('click', action);
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', resetGame);
document.getElementById('win-restart-btn').addEventListener('click', resetGame);

function action() {
    if (currentState === 'PLAYING') {
        bird.flap();
    }
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    currentState = 'PLAYING';
    bgMusic.play().catch(e => console.log("Audio play failed:", e));
    loop();
}

function resetGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');

    bird.reset();
    pipes.reset();

    score = 0;
    frames = 0;
    difficultyMultiplier = 1;
    document.getElementById('current-score').innerText = score;

    currentState = 'PLAYING';
    bgMusic.currentTime = 0;
    bgMusic.play();
    winSound.pause();
    winSound.currentTime = 0;
    loop();
}

function gameOver() {
    if (currentState === 'GAMEOVER') return;
    currentState = 'GAMEOVER';
    hitSound.play();
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    bgMusic.pause();
}

function gameWin() {
    currentState = 'WIN';
    document.getElementById('win-screen').classList.remove('hidden');
    document.getElementById('win-score').innerText = score;
    bgMusic.pause();
    winSound.play();

    // Confetti
    var duration = 3 * 1000;
    var end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
        });
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

// Game Objects
const bird = {
    x: 50,
    y: 150,
    w: 70, // Increased size (was 50)
    h: 52, // Increased size (was 38)
    radius: 25, // Increased hitbox
    frame: 0,
    gravity: 0.15,
    jump: 3.5,
    speed: 0,
    rotation: 0,

    draw: function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.drawImage(birdImg, -this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
    },

    flap: function () {
        this.speed = -this.jump;
    },

    update: function () {
        if (currentState === 'START' || currentState === 'WIN') {
            this.y = 150 + Math.cos(frames / 10) * 5;
            this.rotation = 0;
        } else {
            this.speed += this.gravity;
            this.y += this.speed;

            if (this.y + this.h / 2 >= canvas.height) {
                this.y = canvas.height - this.h / 2;
                gameOver();
            }

            if (this.speed < this.jump / 2) {
                this.rotation = -25 * DEGREE;
            } else {
                this.rotation += 5 * DEGREE;
                this.rotation = Math.min(this.rotation, 90 * DEGREE);
            }
        }
    },

    reset: function () {
        this.y = 150;
        this.speed = 0;
        this.rotation = 0;
    }
}

const pipes = {
    position: [],

    w: 40,
    h: 400,
    gap: 200,
    baseDx: 2,

    get dx() {
        return this.baseDx + (Math.floor(score / 5) * 0.2);
    },

    draw: function () {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];

            if (p.isWinner) {
                // Draw Winner Image on a pillar
                // Let's make it a nice frame
                // Draw the image centered vertically at the random Y position we generated or fixed center
                // Let's draw it in center of screen height approx
                ctx.drawImage(winnerImg, p.x, 100, 200, 300); // 200x300 size
            } else {
                // Top Pipe
                ctx.drawImage(wallImg, p.x, 0, this.w, p.y);
                // Bottom Pipe
                ctx.drawImage(wallImg, p.x, p.y + this.gap, this.w, canvas.height - (p.y + this.gap));
            }
        }
    },

    update: function () {
        // Spawn pipes
        if (frames % 150 === 0) {

            if (score >= WIN_SCORE) {
                // Check if we already spawned the winner
                if (!this.position.some(p => p.isWinner)) {
                    this.position.push({
                        x: canvas.width,
                        y: 100, // Not used for gap, but for position reference
                        isWinner: true,
                        passed: false
                    });
                }
            } else {
                let min = 50;
                let max = canvas.height - 150 - this.gap;
                let y = Math.floor(Math.random() * (max - min + 1) + min);

                this.position.push({
                    x: canvas.width,
                    y: y,
                    isWinner: false,
                    passed: false
                });
            }
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;

            if (p.isWinner) {
                // Check collision with Winner Photo
                // Box is at p.x, 100, width 200, height 300
                // Let's make the hit box generous so they definitely hit it
                if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + 100) {
                    gameWin();
                }
            } else {
                let bottomPipeY = p.y + this.gap;

                // Collision logic
                if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + this.w) {
                    if ((bird.y - bird.radius < p.y) || (bird.y + bird.radius > bottomPipeY)) {
                        gameOver();
                    }
                }

                if (p.x + this.w < bird.x - bird.radius && !p.passed) {
                    score++;
                    p.passed = true;
                    document.getElementById('current-score').innerText = score;
                }
            }

            if (p.x + (p.isWinner ? 200 : this.w) <= 0) {
                this.position.shift();
                i--;
            }
        }
    },

    reset: function () {
        this.position = [];
    }
}

// Background
const bg = {
    draw: function () {
        ctx.fillStyle = "#70c5ce";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}


function loop() {
    if (currentState === 'GAMEOVER' || currentState === 'WIN') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pipes.update();
    pipes.draw();

    bird.update();
    bird.draw();

    frames++;
    requestAnimationFrame(loop);
}

// Initial Setup
function init() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    bird.reset();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bird.draw();
}

window.addEventListener('resize', init);
init();
