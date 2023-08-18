// Canvas Initialization
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.fillStyle = "#0B3D91";  // Deep space blue
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Variables
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 50,
    width: 50,
    height: 30,
    speed: 5,
    bullets: [],
    lives: 3
};

let moveLeft = false;
let moveRight = false;
let score = 0;
let highestScore = localStorage.getItem("highestScore") || 0;
const enemies = [];
let spawnCounter = 0;
let stars = [];
let gasClouds = [];
let planets = [];
let gameActive = true;
let gameOverState = false;
let animationId;

const enemyTypes = {
    'standard': {
        width: 40,
        height: 25,
        speed: 2,
        color: '#F00',  // Red
        health: 1
    },
    'fast': {
        width: 30,
        height: 20,
        speed: 5,
        color: '#FFA500',  // Orange
        health: 1
    },
    'tank': {
        width: 50,
        height: 35,
        speed: 1,
        color: '#800000',  // Dark red
        health: 3
    }
};


function togglePause() {
    gameActive = !gameActive;
}

function initStars() {
    let starCount = 100; // Number of stars
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2
        });
    }
}

function initGasClouds() {
    let cloudCount = 5;
    for (let i = 0; i < cloudCount; i++) {
        gasClouds.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: (Math.random() * canvas.width) / 5
        });
    }
}

initStars();
initGasClouds();

// Event Listeners
document.addEventListener('keydown', (event) => {
    if(event.code === 'ArrowLeft' || event.code === 'KeyA') {
        moveLeft = true;
    } else if(event.code === 'ArrowRight' || event.code === 'KeyD') {
        moveRight = true;
    }
    if(event.code === 'Space') {
        shootBullet();
    }
    if (event.code === 'KeyR' && (gameOverState || !gameActive)) {
        restartGame();
    }
    if (event.code === 'KeyP') {
        togglePause();
    }
});

document.addEventListener('keyup', (event) => {
    if(event.code === 'ArrowLeft' || event.code === 'KeyA') {
        moveLeft = false;
    } else if(event.code === 'ArrowRight' || event.code === 'KeyD') {
        moveRight = false;
    }
});


// Player Functions
function drawPlayer() {
    ctx.fillStyle = '#FFF';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function movePlayer() {
    if(moveLeft && player.x > 0) {
        player.x -= player.speed;
    }
    if(moveRight && (player.x + player.width) < canvas.width) {
        player.x += player.speed;
    }
}
// Bullet Functions
function shootBullet() {
    player.bullets.push({
        x: player.x + player.width / 2,
        y: player.y,
        width: 5,
        height: 10,
        speed: 7
    });
}

function drawBullets() {
    ctx.fillStyle = '#FF0'; // Yellow bullets
    for(let i = 0; i < player.bullets.length; i++) {
        ctx.fillRect(player.bullets[i].x, player.bullets[i].y, player.bullets[i].width, player.bullets[i].height);
        
        // Move the bullet up
        player.bullets[i].y -= player.bullets[i].speed;
        
        // If bullet goes out of canvas, remove it from the array
        if(player.bullets[i].y < 0) {
            player.bullets.splice(i, 1);
            i--;
        }
    }
}

// Enemy Functions

function willOverlap(newEnemy, existingEnemy) {
    // Calculate future Y position when both enemies reach the bottom of the canvas
    const newYPosWhenBottom = canvas.height - newEnemy.y;
    const existingYPosWhenBottom = canvas.height - existingEnemy.y;
    
    const newEnemyTimeToBottom = newYPosWhenBottom / newEnemy.speed;
    const existingEnemyTimeToBottom = existingYPosWhenBottom / existingEnemy.speed;

    // Predict the X position based on their speed by the time they reach the bottom
    // Note: If enemies have left-right movement, you'll have to adjust this prediction.
    const newEnemyFutureX = newEnemy.x; 
    const existingEnemyFutureX = existingEnemy.x;

    // Check if their paths will overlap before they reach the bottom of the canvas
    if (
        Math.abs(newEnemyFutureX - existingEnemyFutureX) < Math.max(newEnemy.width, existingEnemy.width) &&
        Math.abs(newEnemyTimeToBottom - existingEnemyTimeToBottom) < Math.max(newEnemy.height, existingEnemy.height) / Math.min(newEnemy.speed, existingEnemy.speed)
    ) {
        return true;
    }

    return false;
}

function spawnEnemies() {
    spawnCounter++;

    if (spawnCounter >= 80) {
        const enemyKeys = Object.keys(enemyTypes);
        const randomEnemyType = enemyKeys[Math.floor(Math.random() * enemyKeys.length)];
        const enemyTemplate = enemyTypes[randomEnemyType];

        const potentialEnemy = {
            x: Math.random() * (canvas.width - enemyTemplate.width),
            y: 0 - enemyTemplate.height,
            width: enemyTemplate.width,
            height: enemyTemplate.height,
            speed: enemyTemplate.speed,
            color: enemyTemplate.color,
            health: enemyTemplate.health,
            type: randomEnemyType
        };

        let overlapsWithExisting = false;
        for(let i = 0; i < enemies.length; i++) {
            if(willOverlap(potentialEnemy, enemies[i])) {
                overlapsWithExisting = true;
                break;
            }
        }

        if (!overlapsWithExisting) {
            enemies.push(potentialEnemy);
            spawnCounter = 0;
        }
    }
}


function updateEnemies() {
    for(let i = 0; i < enemies.length; i++) {
        enemies[i].y += enemies[i].speed;

        // If an enemy goes out of the canvas, remove it
        if(enemies[i].y > canvas.height) {
            enemies.splice(i, 1);
            i--;
        }
    }
}

function drawEnemies() {
    for (let i = 0; i < enemies.length; i++) {
        ctx.fillStyle = enemies[i].color;
        ctx.fillRect(enemies[i].x, enemies[i].y, enemies[i].width, enemies[i].height);
    }
}

// Collision and Core Functions
function checkCollisions() {
    // Bullet-to-enemy collisions
    for (let e = 0; e < enemies.length; e++) {
        for (let b = 0; b < player.bullets.length; b++) {
            if (rectIntersect(player.bullets[b], enemies[e])) {
                score++;

                enemies[e].health--;

                if (enemies[e].health <= 0) {
                    if (score % 10 === 0) {
                        player.lives++;
                    }

                    // Remove enemy from array
                    enemies.splice(e, 1);
                    e--;
                }

                // Remove bullet from array
                player.bullets.splice(b, 1);
                b--;

                break;
            }
        }
    }

    
    // Player-to-enemy collisions
    for (let e = 0; e < enemies.length; e++) {
        if (rectIntersect(player, enemies[e])) {
            player.lives--;
            enemies.splice(e, 1);

            if (player.lives <= 0) {
                gameOver();
            }

            e--;
        }
    }
}

function rectIntersect(rectA, rectB) {
    return (
        rectA.x < rectB.x + rectB.width &&
        rectA.x + rectA.width > rectB.x &&
        rectA.y < rectB.y + rectB.height &&
        rectA.y + rectA.height > rectB.y
    );
}

// Display Functions

// Score Display
function displayScore() {
    ctx.font = "20px Arial";
    ctx.fillStyle = "#FFF";  

    let scoreText = "Score: " + score;
    let textWidth = ctx.measureText(scoreText).width;
    ctx.fillText(scoreText, canvas.width - textWidth - 10, 30); // -10 for a little padding from the edge
}

function displayHighestScore() {
    if (score > highestScore) {
        localStorage.setItem("highestScore", score);
    }
    highestScore = localStorage.getItem("highestScore");
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#FFF';

    let highScoreText = 'High Score: ' + highestScore;
    let textWidth = ctx.measureText(highScoreText).width;
    ctx.fillText(highScoreText, canvas.width - textWidth - 10, 60); // Adjusted to be right-aligned
}

function drawHeart(x, y, size) {
    ctx.beginPath();

    const topCurveHeight = size * 0.3;
    const bodyHeight = size - topCurveHeight;

    ctx.moveTo(x, y + topCurveHeight);

    // Top left curve
    ctx.bezierCurveTo(
        x, y,
        x - size / 2, y,
        x - size / 2, y + topCurveHeight
    );

    // Bottom left part
    ctx.bezierCurveTo(
        x - size / 2, y + (size + topCurveHeight) / 2,
        x, y + size,
        x, y + size - bodyHeight
    );

    // Bottom right part
    ctx.bezierCurveTo(
        x, y + size,
        x + size / 2, y + (size + topCurveHeight) / 2,
        x + size / 2, y + topCurveHeight
    );

    // Top right curve
    ctx.bezierCurveTo(
        x + size / 2, y,
        x, y,
        x, y + topCurveHeight
    );

    ctx.closePath();
    ctx.fillStyle = '#FFC0CB';  // Pink color
    ctx.fill();
}


// Draw hearts to represent lives in the top left corner
function drawHearts() {
    const heartSize = 20;
    for (let i = 0; i < player.lives; i++) {
        drawHeart(10 + i * (heartSize + 10), 10, heartSize);
    }
}

function drawStars() {
    ctx.fillStyle = "#FFFFFF";
    for (let star of stars) {
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
}

function drawGasClouds() {
    for (let cloud of gasClouds) {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
        ctx.fill();
    }
}

function updateBackground() {
    let scrollSpeed = 0.5;  // Adjust for desired speed
    for (let star of stars) {
        star.y += scrollSpeed;
        if (star.y > canvas.height) {
            star.y = 0;
        }
    }

    for (let cloud of gasClouds) {
        cloud.y += scrollSpeed;
        if (cloud.y - cloud.radius > canvas.height) {
            cloud.y = -cloud.radius;
        }
    }

    for (let planet of planets) {
        planet.y += scrollSpeed;
        if (planet.y - planet.radius > canvas.height) {
            planet.y = -planet.radius;
        }
    }
}

function gameOver() {
    gameActive = false;  // Set the game as not active.
    gameOverState = true; // Game over, man
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "40px Arial";
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Arial";
    ctx.fillText("Press 'R' to restart", canvas.width / 2, canvas.height / 2 + 40);
    ctx.textAlign = "start";  // Resetting the textAlign property
}


function restartGame() {
    cancelAnimationFrame(animationId); // Cancel the previous game loop

    score = 0;
    player.lives = 3;
    player.bullets = [];
    enemies.length = 0;
    gameActive = true;  // Set the game back to active.
    gameOverState = false; // Reset game over state
    gameLoop();
}


// Main Game Loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameOverState) {
        // Display the game over screen
        ctx.font = "40px Arial";
        ctx.fillStyle = "#FFF";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        ctx.font = "20px Arial";
        ctx.fillText("Press 'R' to restart", canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = "start";
    } else if (!gameActive) {
        // Display "Paused" message when the game is paused
        ctx.fillStyle = "#FFF";  // White color
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Paused", canvas.width / 2, canvas.height / 2);
        ctx.textAlign = "start";
    } else {
        updateBackground();
        movePlayer();
        drawPlayer();
        drawBullets();
        spawnEnemies();
        updateEnemies();
        drawEnemies();
        checkCollisions();
        drawHearts();
        displayScore();
        displayHighestScore();
        drawStars();
    }

    animationId = requestAnimationFrame(gameLoop);
}


gameLoop();