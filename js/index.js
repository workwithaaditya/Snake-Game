let inputDir = { x: 0, y: 0 };
const foodSound = new Audio('food.mp3');
const gameOverSound = new Audio('gameover.mp3');
const moveSound = new Audio('move.mp3');
// const musicSound = new Audio('music.mp3');
let speed = 6;
let score = 0;
let level = 1;
let lastPaintTime = 0;
let isPaused = false;
let isDevilMode = false;
let devilModeThreshold = 10;
let obstacleArray = [];
let lastDirection = 'right';
let tickCounter = 0;

// Lives system
let lives = 3;
let maxLives = 3;

// Power fruit system
let powerFruit = null;
let hasPowerUp = false;
let powerUpDuration = 0;

// Question timer state
let questionTimerInterval = null;
let questionTimeLeft = 0; // seconds

// Level configurations
const levelConfigs = {
    1: { speed: 6, obstacleCount: 0, specialFeatures: [] },
    2: { speed: 7, obstacleCount: 2, specialFeatures: ['movingObstacles'] },
    3: { speed: 8, obstacleCount: 3, specialFeatures: ['movingObstacles', 'teleportingFood'] },
    4: { speed: 9, obstacleCount: 4, specialFeatures: ['movingObstacles', 'teleportingFood', 'mazeWalls'] },
    5: { speed: 10, obstacleCount: 5, specialFeatures: ['movingObstacles', 'teleportingFood', 'mazeWalls', 'ghostFood'] }
};

// Create level display
const levelDisplay = document.createElement('div');
levelDisplay.className = 'level-display';
document.body.appendChild(levelDisplay);

function updateLevel() {
    const newLevel = Math.floor(score / 5) + 1;
    if (newLevel !== level) {
        level = newLevel;
        // set speed from config if available, otherwise scale gradually
        if (levelConfigs[level]) {
            speed = levelConfigs[level].speed;
        } else {
            // after configured levels, increase speed slowly but cap it
            speed = Math.min(10 + Math.floor((level - 5) / 4), 24);
        }
        updateLevelDisplay();
        generateObstacles();

        // Update snake appearance for defined level classes; for >5 keep the last style
        document.querySelectorAll('.snake').forEach(segment => {
            segment.classList.remove('level-1', 'level-2', 'level-3', 'level-4', 'level-5');
            const styleLevel = Math.min(level, 5);
            segment.classList.add(`level-${styleLevel}`);
        });
    }
}

function updateLevelDisplay() {
    levelDisplay.innerHTML = `LEVEL ${level}`;
    if (level > 1) {
        levelDisplay.classList.add('flame-text');
    }
    checkAndUnlockTiers();
}

function checkAndUnlockTiers() {
    // Update highest level reached
    if (level > highestLevelReached) {
        highestLevelReached = level;
    }
    
    // Check for ELITE tier (Level 20)
    if (level >= 20 && !unlockedTiers.elite) {
        unlockedTiers.elite = true;
        unlockTier('elite', 'ELITE', '⚡ THE CHOSEN ONE ⚡');
    }
    
    // Check for LEGENDARY tier (Level 50)
    if (level >= 50 && !unlockedTiers.legendary) {
        unlockedTiers.legendary = true;
        unlockTier('legendary', 'LEGENDARY', '👑 MASTER OF SERPENTS 👑');
    }
    
    // Check for MYTHIC tier (Level 100)
    if (level >= 100 && !unlockedTiers.mythic) {
        unlockedTiers.mythic = true;
        unlockTier('mythic', 'MYTHIC', '🔥 IMMORTAL LEGEND 🔥');
    }
}

function unlockTier(tierId, tierName, message) {
    const tierCard = document.getElementById(`tier${tierId.charAt(0).toUpperCase() + tierId.slice(1)}`);
    const tierStatus = document.getElementById(`${tierId}Status`);
    
    // Add unlocked class with animation
    tierCard.classList.add('unlocked');
    tierStatus.classList.remove('locked');
    tierStatus.classList.add('unlocked');
    tierStatus.textContent = '✅ UNLOCKED';
    
    // Show celebration message
    updateSassyBot(message, true);
    
    // Play a sound effect (optional)
    foodSound.play();
    
    // Create confetti effect
    createTierCelebration();
}

function createTierCelebration() {
    const celebration = document.createElement('div');
    celebration.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Press Start 2P', cursive;
        font-size: 32px;
        color: #ffd700;
        text-shadow: 0 0 20px #ffd700, 0 0 40px #ffd700;
        z-index: 10000;
        animation: tierPop 2s ease-out forwards;
        pointer-events: none;
    `;
    celebration.textContent = '🎉 TIER UNLOCKED! 🎉';
    document.body.appendChild(celebration);
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes tierPop {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.2);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        celebration.remove();
        style.remove();
    }, 2000);
}

// Sassy bot messages
const sassyMessages = {
    gameOver: [
        "LOL! Even my grandma plays better than that! 👵",
        "Wow, you're really committed to losing, aren't you? 🤦",
        "Is your keyboard broken or are you just that bad? ⌨️",
        "I've seen snails move faster than your reactions! 🐌",
        "Maybe try something easier... like Minesweeper? 💣",
        "That was... embarrassing. Want to embarrass yourself again? 😏",
        "Did you just close your eyes while playing? 👀",
        "Error 404: Skill not found! 🤖",
        "Are you trying to set a record for lowest score? 🏆",
        "Even a potato could do better! 🥔"
    ],
    lowScore: [
        "Is that all you've got? My pet rock scores better! 🪨",
        "Still in single digits? How... disappointing. 😴",
        "I'm falling asleep watching you play... 😪",
        "Maybe try using your hands instead of your feet? 🦶"
    ],
    mediumScore: [
        "Oh look who's finally learning to play! 👶",
        "Getting better... but still pretty bad! 😅",
        "Don't get too excited, you're still terrible! 🎭"
    ],
    popup: [
        "HELLO! JUST CHECKING IF YOU'RE STILL BAD! 😈",
        "SURPRISE! Still playing like a noob? 🎮",
        "LOOK AT ME! I'm watching you fail! 👻",
        "BOO! Scared you into another game over? 👹",
        "HEY! HEY! HEY! Still can't play? 🤡"
    ],
    savageRoasts: [
        "🔥 ACHIEVEMENT UNLOCKED: World's Most Consistent Loser! 🏆",
        "👑 Congratulations! You've mastered the art of being terrible!",
        "🎯 Your accuracy in hitting walls is truly impressive!",
        "🧠 Your brain and this snake have something in common - they both keep hitting walls!",
        "🦥 Even sloths think you're moving too slow!",
        "🎮 Have you considered a career in professional losing?",
        "🌟 Special talent alert: Making simple games look impossible!",
        "🏃 The only thing faster than your snake is your ability to lose!",
        "💫 You're so bad, you make tutorial levels look challenging!",
        "🎭 Plot twist: The snake is actually trying to escape your terrible gaming skills!"
    ],
    devilTaunts: [
        "👿 PATHETIC! Even my grandma's pet snail plays better!",
        "😈 MWAHAHA! Your failure feeds my dark soul!",
        "🔥 HOT GARBAGE! That's what your gaming skills are!",
        "👹 Your skills are so bad, they make demons cry!",
        "💀 DIE DIE DIE! Oh wait, you already did... AGAIN!",
        "😱 SCREAMING won't help, but feel free to try!",
        "🦹‍♂️ Evil laugh intensifies at your miserable performance!",
        "🎃 BOO! Scared? Not as scared as I am of your terrible playing!",
        "🕯️ Rest in pieces... of pure embarrassment!",
        "🔪 Stabbed by your own incompetence!",
        "⚰️ Here lies your gaming dignity... OH WAIT, you never had any!"
    ]
};

let popupTimeout;
let deathCount = 0;

// Tier system tracking
let unlockedTiers = {
    elite: false,
    legendary: false,
    mythic: false
};
let highestLevelReached = 0;

function createGameOverOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';
    document.body.appendChild(overlay);
}

function getDevilTaunt() {
    return sassyMessages.devilTaunts[Math.floor(Math.random() * sassyMessages.devilTaunts.length)];
}

function playDevilGameOverSequence() {
    createGameOverOverlay();
    const sassyBot = document.querySelector('.sassy-bot');
    const botMessage = document.querySelector('.bot-message');
    const botAvatar = document.querySelector('.bot-avatar');
    
    // Initial dramatic pause
    setTimeout(() => {
        sassyBot.className = 'sassy-bot game-over-devil';
        botAvatar.textContent = '😈';
        
        // Sequence of taunts
        let taunts = [
            getDevilTaunt(),
            "💀 Your pathetic score: " + score,
            getSavageRoast(),
            "👿 GAME OVER, MORTAL!"
        ];
        
        let delay = 0;
        taunts.forEach((taunt, index) => {
            setTimeout(() => {
                botMessage.style.animation = 'none';
                botMessage.offsetHeight;
                botMessage.style.animation = 'messageGlow 2s ease-in-out infinite';
                botMessage.innerHTML = `<span class="flame-text">${taunt}</span>`;
                
                if (index === taunts.length - 1) {
                    // After last taunt, show end screen with buttons
                    setTimeout(() => {
                        showEndScreen();
                    }, 3000);
                }
            }, delay);
            delay += 3500; // Show each taunt for 3.5 seconds
        });
    }, 500);
}

function showEndScreen() {
    // Create end screen container
    const endScreen = document.createElement('div');
    endScreen.className = 'end-screen';
    endScreen.innerHTML = `
        <div class="end-screen-content">
            <div class="end-devil">😈</div>
            <div class="end-quote">${getDevilTaunt()}</div>
            <div class="end-score">
                <div class="score-label">FINAL SCORE</div>
                <div class="score-number">${score}</div>
            </div>
            <div class="end-buttons">
                <button class="end-btn restart-btn" id="restartBtn">
                    <span class="btn-icon">🔄</span>
                    <span class="btn-text">RESTART</span>
                </button>
                <button class="end-btn home-btn" id="homeBtn">
                    <span class="btn-icon">🏠</span>
                    <span class="btn-text">HOME</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(endScreen);
    
    // Add button event listeners
    document.getElementById('restartBtn').addEventListener('click', handleRestart);
    document.getElementById('homeBtn').addEventListener('click', handleHome);
}

function handleRestart() {
    // Remove end screen and overlay
    const endScreen = document.querySelector('.end-screen');
    const overlay = document.querySelector('.game-over-overlay');
    if (endScreen) endScreen.remove();
    if (overlay) overlay.remove();
    
    // Reset bot to normal
    const sassyBot = document.querySelector('.sassy-bot');
    const botAvatar = document.querySelector('.bot-avatar');
    const botMessage = document.querySelector('.bot-message');
    sassyBot.className = 'sassy-bot show floating';
    botAvatar.textContent = '😈';
    botMessage.textContent = 'Back for more? Let\'s see if you can do better!';
    
    // Reset ALL game state completely
    score = 0;
    updateScore();
    level = 1;
    speed = 6;
    updateLevelDisplay();
    lives = maxLives;
    updateLives();
    snakeArray = [{ x: 13, y: 15 }];
    food = { x: 6, y: 7 };
    inputDir = { x: 0, y: 0 };
    isDevilMode = false;
    document.querySelector('.body').classList.remove('devil-mode');
    obstacleArray = [];
    powerFruit = null;
    hasPowerUp = false;
    powerUpDuration = 0;
    tickCounter = 0;
    lastPaintTime = 0;
    
    // Resume game
    isPaused = false;
}

function handleHome() {
    // Reload the page to go to home/initial state
    window.location.reload();
}

function updateSassyBot(message, forceCenterPopup = false, isGameOver = false) {
    const sassyBot = document.querySelector('.sassy-bot');
    const botMessage = document.querySelector('.bot-message');
    
    if (isGameOver) {
        playDevilGameOverSequence();
        return;
    }
    
    // Clear any existing timeout
    if (popupTimeout) {
        clearTimeout(popupTimeout);
    }

    // Reset classes
    sassyBot.className = 'sassy-bot';
    
    if (forceCenterPopup) {
        // Center popup with shake animation
        sassyBot.classList.add('center-popup');
        // Return to side after 2 seconds
        popupTimeout = setTimeout(() => {
            sassyBot.className = 'sassy-bot floating';
        }, 2000);
    } else {
        sassyBot.classList.add('floating');
    }

    // Update message with animation reset
    botMessage.style.animation = 'none';
    botMessage.offsetHeight; // Trigger reflow
    botMessage.style.animation = 'messageGlow 2s ease-in-out infinite';
    botMessage.textContent = message;
}

function getRandomPopupMessage() {
    return sassyMessages.popup[Math.floor(Math.random() * sassyMessages.popup.length)];
}

function getSavageRoast() {
    return sassyMessages.savageRoasts[Math.floor(Math.random() * sassyMessages.savageRoasts.length)];
}

// Random popup function
function scheduleRandomPopup() {
    const randomTime = Math.random() * (15000 - 8000) + 8000; // Random time between 8-15 seconds
    setTimeout(() => {
        updateSassyBot(getRandomPopupMessage(), true);
        scheduleRandomPopup(); // Schedule next popup
    }, randomTime);
}

function getRandomMessage(messageType) {
    const messages = sassyMessages[messageType];
    return messages[Math.floor(Math.random() * messages.length)];
}

// Initialize buttons
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');

// Function to update score display
function updateScore() {
    document.querySelector('.score-value').innerText = score;
}

function updateLives() {
    const livesHearts = document.querySelectorAll('.life-heart');
    livesHearts.forEach((heart, index) => {
        if (index < lives) {
            heart.classList.remove('lost');
        } else {
            heart.classList.add('lost');
        }
    });
}

function spawnPowerFruit() {
    // spawnPowerFruit(force) -> when force=true it will try to place a power fruit
    // otherwise it only spawns rarely during gameplay (reduced frequency)
    const FORCE_ARG = arguments[0] === true;
    const chance = FORCE_ARG ? 1 : 0.12; // if forced, attempt placement; otherwise 12% when called
    if ((FORCE_ARG || Math.random() < chance) && level >= 10) {
        let validPosition = false;
        let attempts = 0;

        while (!validPosition && attempts < 80) {
            const candidate = {
                x: Math.round(2 + (16 - 2) * Math.random()),
                y: Math.round(2 + (16 - 2) * Math.random())
            };

            // Check if position is valid (not on snake or obstacles or food)
            validPosition = true;
            for (let segment of snakeArray) {
                if (segment.x === candidate.x && segment.y === candidate.y) {
                    validPosition = false;
                    break;
                }
            }

            if (validPosition && food.x === candidate.x && food.y === candidate.y) {
                validPosition = false;
            }

            for (let obstacle of obstacleArray) {
                if (obstacle.x === candidate.x && obstacle.y === candidate.y) {
                    validPosition = false;
                    break;
                }
            }

            if (validPosition) {
                powerFruit = candidate;
                break;
            }

            attempts++;
        }

        if (!validPosition) {
            powerFruit = null;
        }
    } else {
        powerFruit = null;
    }
}

let snakeArray = [
    { x: 13, y: 15 }
]
let food = { x: 6, y: 7 };
const board = document.getElementById('board');

// Track which score milestones (10,20,...) have already triggered a question
const askedMilestones = new Set();

// Tricky questions array — each entry: {q, choices:[], answerIndex}
const trickyQuestions = [
    { q: 'What 3-digit number becomes 3 times smaller when its last digit is moved to the front?', choices: ['192','219','273','132'], answerIndex: 0 },
    { q: 'I speak without a mouth and hear without ears. I have nobody, but I come alive with wind. What am I?', choices: ['Echo','Shadow','Fire','Water'], answerIndex: 0 },
    { q: 'If 2+3=10 and 7+2=63 then 6+5=? (pattern)', choices: ['66','55','77','121'], answerIndex: 0 },
    { q: 'Which is heavier: 1kg of iron or 1kg of feathers?', choices: ['Iron','Feathers','Both are same','Impossible to tell'], answerIndex: 2 },
    { q: 'You have three boxes, one contains only apples, one contains only oranges, and one contains both. All labels are wrong. Which box has both?', choices: ['The one labeled apples','The one labeled oranges','The one labeled both','Cannot determine'], answerIndex: 0 }
];

// Show question modal
function showQuestionModal(questionObj) {
    isPaused = true;
    const modal = document.getElementById('questionModal');
    const text = document.getElementById('questionText');
    const choicesContainer = document.getElementById('questionChoices');
    const skipBtn = document.getElementById('skipQuestion');
    const timerBar = document.getElementById('questionTimerBar');
    const TOTAL_TIME = 12; // seconds for player to answer

    text.textContent = questionObj.q;
    choicesContainer.innerHTML = '';

    // start timer
    if (questionTimerInterval) clearInterval(questionTimerInterval);
    questionTimeLeft = TOTAL_TIME;
    if (timerBar) timerBar.style.width = '100%';
    questionTimerInterval = setInterval(() => {
        questionTimeLeft = Math.max(0, questionTimeLeft - 0.1);
        if (timerBar) timerBar.style.width = Math.max(0, (questionTimeLeft / TOTAL_TIME) * 100) + '%';
        if (questionTimeLeft <= 0) {
            clearInterval(questionTimerInterval);
            questionTimerInterval = null;
            // time up -> bomb explode
            closeQuestionModal();
            triggerBombTimeout();
        }
    }, 100);

    questionObj.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice;
        btn.addEventListener('click', () => handleAnswer(idx, questionObj.answerIndex, btn));
        choicesContainer.appendChild(btn);
    });

    skipBtn.onclick = () => {
        // skipping counts as wrong (penalty)
        closeQuestionModal();
        applyWrongAnswerPenalty();
    };

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
}

function closeQuestionModal() {
    const modal = document.getElementById('questionModal');
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    isPaused = false;
    // clear any running timer
    if (questionTimerInterval) {
        clearInterval(questionTimerInterval);
        questionTimerInterval = null;
    }
    const timerBar = document.getElementById('questionTimerBar');
    if (timerBar) timerBar.style.width = '0%';
}

function handleAnswer(selectedIndex, answerIndex, btn) {
    if (selectedIndex === answerIndex) {
        // correct — show positive message briefly and resume
        btn.classList.add('correct');
        updateSassyBot('Nice! You answered correctly.', true);
        setTimeout(() => {
            closeQuestionModal();
            // No penalty for correct answer - just continue playing
        }, 1000);
    } else {
        // wrong — increase difficulty
        btn.classList.add('wrong');
        setTimeout(() => {
            closeQuestionModal();
            applyWrongAnswerPenalty();
        }, 700);
    }
}

function applyWrongAnswerPenalty() {
    // increase level (harder) up to max 5 and increase speed & obstacles
    level = Math.min(level + 1, 5);
    speed = Math.min(speed + 1, 14);
    generateObstacles();
    updateLevelDisplay();
    updateSassyBot(getDevilTaunt(), true);
}

// Bomb / timeout handling
function triggerBombTimeout() {
    // show explosion overlay and apply heavy penalty
    const expl = document.getElementById('explosion');
    if (expl) {
        expl.classList.add('show');
        expl.setAttribute('aria-hidden', 'false');
    }
    // apply penalty: lose a large chunk of snake length
    setTimeout(() => {
        bombExplode();
        if (expl) {
            expl.classList.remove('show');
            expl.setAttribute('aria-hidden', 'true');
        }
    }, 900);
}

function bombExplode() {
    const before = snakeArray.length;
    const reduce = Math.max(2, Math.floor(snakeArray.length / 2));
    for (let i = 0; i < reduce; i++) {
        if (snakeArray.length > 1) snakeArray.pop();
    }
    generateObstacles();
    updateSassyBot(`💥 BOOM! You lost ${before - snakeArray.length} segments!`, true);
}

// Called after score increments to check milestone
function checkQuestionMilestone() {
    if (score > 0 && score % 10 === 0 && !askedMilestones.has(score)) {
        askedMilestones.add(score);
        // pick random question
        const q = trickyQuestions[Math.floor(Math.random() * trickyQuestions.length)];
        showQuestionModal(q);
    }
}

function main(ctime) {
    window.requestAnimationFrame(main);

    if (isPaused) {
        return;
    }

    if ((ctime - lastPaintTime) / 1000 < 1 / speed) {
        return;
    }
    lastPaintTime = ctime;
    gameEngine()

}
// function isCollide(snake) {

//     // return false;

//     for (let i = 1; i < snakeArray.length; i++) {

//         if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {

//             return true;

//         }
//     }

//     if (snake[0].x >= 18 || snake[0].x <= 0 && snake[0].y >= 18 || snake[0].y <= 0) {

//         return true;

//     }
// }

function wrapPosition(pos) {
    return {
        x: pos.x <= 0 ? 17 : (pos.x >= 18 ? 1 : pos.x),
        y: pos.y <= 0 ? 17 : (pos.y >= 18 ? 1 : pos.y)
    };
}

function isCollide(snake) {
    // Check collision with snake body
    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
            return true;
        }
    }

    // Check collision with obstacles in devil mode
    if (isDevilMode) {
        for (let obstacle of obstacleArray) {
            if (snake[0].x === obstacle.x && snake[0].y === obstacle.y) {
                return true;
            }
        }
    }

    return false;
}

function generateObstacles() {
    obstacleArray = [];
    // Make obstacle growth less aggressive: fewer obstacles at lower/medium scores
    const numObstacles = Math.min(Math.floor(score / 8) + 1, 6); // Reduced frequency and cap
    
    for (let i = 0; i < numObstacles; i++) {
        let obstaclePos;
        let isValid;
        
        do {
            isValid = true;
            obstaclePos = {
                x: Math.round(2 + (16 - 2) * Math.random()),
                y: Math.round(2 + (16 - 2) * Math.random())
            };

            // Check if position conflicts with snake
            for (let segment of snakeArray) {
                if (segment.x === obstaclePos.x && segment.y === obstaclePos.y) {
                    isValid = false;
                    break;
                }
            }

            // Check if position conflicts with food
            if (food.x === obstaclePos.x && food.y === obstaclePos.y) {
                isValid = false;
            }

            // Check if position conflicts with other obstacles
            for (let obstacle of obstacleArray) {
                if (obstacle.x === obstaclePos.x && obstacle.y === obstaclePos.y) {
                    isValid = false;
                    break;
                }
            }
        } while (!isValid);

        obstacleArray.push(obstaclePos);
    }
}

function activateDevilMode() {
    isDevilMode = true;
    document.querySelector('.body').classList.add('devil-mode');
    speed = Math.min(speed + 2, 12); // Increase speed but cap it
    generateObstacles();
    updateSassyBot("👿 DEVIL MODE ACTIVATED! Good luck... you'll need it!", true);
}

function isValidFoodPosition(pos) {
    // Check collision with snake
    for (let segment of snakeArray) {
        if (segment.x === pos.x && segment.y === pos.y) {
            return false;
        }
    }
    
    // Check collision with obstacles
    for (let obstacle of obstacleArray) {
        if (obstacle.x === pos.x && obstacle.y === pos.y) {
            return false;
        }
    }
    
    return true;
}

function generateNewFood() {
    let newFood;
    do {
        newFood = {
            x: Math.round(2 + (16 - 2) * Math.random()),
            y: Math.round(2 + (16 - 2) * Math.random())
        };
    } while (!isValidFoodPosition(newFood));
    
    return newFood;
}

function updateSnakeDirection(head) {
    const directionClasses = {
        '0,-1': 'head-up',
        '0,1': 'head-down',
        '-1,0': 'head-left',
        '1,0': 'head-right'
    };
    
    const directionKey = `${inputDir.x},${inputDir.y}`;
    return directionClasses[directionKey] || 'head-right';
}

function gameEngine() {
    tickCounter++;
    
    // Show sassy bot when game starts (first movement)
    if (tickCounter === 1) {
        const sassyBot = document.getElementById('sassyBot');
        if (sassyBot) {
            sassyBot.style.display = 'block';
            // Add show class to slide from left to center
            setTimeout(() => {
                sassyBot.classList.add('show', 'floating');
            }, 100);
        }
    }
    
    if (isCollide(snakeArray)) {
        // Lose a life instead of immediate game over
        lives--;
        updateLives();
        
        if (lives <= 0) {
            // Game over - all lives lost
            gameOverSound.play();
            
            // STOP the game immediately
            isPaused = true;
            inputDir = { x: 0, y: 0 };
            
            // Store final stats
            const finalScore = score;
            
            // Don't reset game state yet - wait for restart
            deathCount++;
            
            // Play dramatic game over sequence
            updateSassyBot("", false, true);
            
            // Stop execution here
            return;
        } else {
            // Just lost a life, respawn snake
            gameOverSound.play();
            snakeArray = [{ x: 13, y: 15 }];
            inputDir = { x: 0, y: 0 };
            updateSassyBot(`💔 Lost a life! ${lives} remaining!`, true);
        }
        
        return;
    }
    
    // Update power-up duration
    if (hasPowerUp) {
        powerUpDuration--;
        if (powerUpDuration <= 0) {
            hasPowerUp = false;
            updateSassyBot('Power-up expired!', true);
        }
    }
    
    // Spawn power fruit occasionally (reduced frequency)
    if (!powerFruit && Math.random() < 0.006 && level >= 10) {
        spawnPowerFruit();
    }
    
    // Check for power fruit consumption
    if (powerFruit && snakeArray[0].y === powerFruit.y && snakeArray[0].x === powerFruit.x) {
        foodSound.play();
        hasPowerUp = true;
        powerUpDuration = 100;
        powerFruit = null;
        score += 5;
        updateScore();
        updateSassyBot('🍎 POWER FRUIT! Destroys obstacles!', true);
        obstacleArray = [];
        // Rare chance to spawn another power fruit after clearing obstacles
        if (!powerFruit && Math.random() < 0.25) {
            spawnPowerFruit(true);
        }
    }
    
    // Check for food consumption
    if (snakeArray[0].y === food.y && snakeArray[0].x === food.x) {
        foodSound.play();
        score += 1;
        updateScore();
        checkQuestionMilestone();
        updateLevel();
        
        if (score < 5) {
            updateSassyBot(getRandomMessage('lowScore'));
        } else if (score < 10) {
            updateSassyBot(getRandomMessage('mediumScore'));
        }
        
        // Grow snake - don't pop tail
        snakeArray.unshift({ x: snakeArray[0].x + inputDir.x, y: snakeArray[0].y + inputDir.y });
        // Apply wrapping to new head
        snakeArray[0] = wrapPosition(snakeArray[0]);
        
        food = generateNewFood();
        
        // Chance to spawn power fruit after eating food
        if (!powerFruit && Math.random() < 0.15 && level >= 10) {
            spawnPowerFruit();
        }
    } else {
        // Move snake without growing
        for (let i = snakeArray.length - 2; i >= 0; i--) {
            snakeArray[i + 1] = { ...snakeArray[i] };
        }
        
        // Update head position with wrapping
        snakeArray[0] = {
            x: snakeArray[0].x + inputDir.x,
            y: snakeArray[0].y + inputDir.y
        };
        snakeArray[0] = wrapPosition(snakeArray[0]);
    }
    
    // Clear board and render everything
    board.innerHTML = "";
    
    // Render snake with segments
    snakeArray.forEach((e, index) => {
        const snakeElement = document.createElement('div');
        snakeElement.style.gridRowStart = e.y;
        snakeElement.style.gridColumnStart = e.x;
        snakeElement.classList.add('snake', `level-${level}`);
        
        if (index === 0) {
            snakeElement.classList.add('head');
            snakeElement.classList.add(updateSnakeDirection());
        } else if (index === snakeArray.length - 1) {
            snakeElement.classList.add('snake-tail');
        } else {
            snakeElement.classList.add('snake-body');
        }
        
        board.appendChild(snakeElement);
    });

    // Render food
    const foodElement = document.createElement('div');
    foodElement.style.gridRowStart = food.y;
    foodElement.style.gridColumnStart = food.x;
    foodElement.classList.add('food');
    board.appendChild(foodElement);
    
    // Render power fruit
    if (powerFruit) {
        const powerFruitElement = document.createElement('div');
        powerFruitElement.style.gridRowStart = powerFruit.y;
        powerFruitElement.style.gridColumnStart = powerFruit.x;
        powerFruitElement.classList.add('power-fruit');
        powerFruitElement.textContent = '🍎';
        board.appendChild(powerFruitElement);
    }

    // Render obstacles in devil mode
    if (isDevilMode) {
        obstacleArray.forEach(obstacle => {
            const obstacleElement = document.createElement('div');
            obstacleElement.style.gridRowStart = obstacle.y;
            obstacleElement.style.gridColumnStart = obstacle.x;
            obstacleElement.classList.add('obstacle');
            board.appendChild(obstacleElement);
        });
    }

    // Check for devil mode activation
    if (!isDevilMode && score >= devilModeThreshold) {
        activateDevilMode();
    }
}

function updateSnakeDirection(head) {
    const directionClasses = {
        '0,-1': 'head-up',
        '0,1': 'head-down',
        '-1,0': 'head-left',
        '1,0': 'head-right'
    };
    
    const directionKey = `${inputDir.x},${inputDir.y}`;
    return directionClasses[directionKey] || 'head-right';
}

window.requestAnimationFrame(main);
window.addEventListener('keydown', e => {
    if (isPaused) return;

    let moved = true;
    let newDir = { x: inputDir.x, y: inputDir.y };

    switch (e.key.toLowerCase()) {
        case "arrowup":
        case "w":
            if (lastDirection !== 'down') { // Prevent 180-degree turns
                newDir.x = 0;
                newDir.y = -1;
                lastDirection = 'up';
            }
            break;
        case "arrowdown":
        case "s":
            if (lastDirection !== 'up') {
                newDir.x = 0;
                newDir.y = 1;
                lastDirection = 'down';
            }
            break;
        case "arrowleft":
        case "a":
            if (lastDirection !== 'right') {
                newDir.x = -1;
                newDir.y = 0;
                lastDirection = 'left';
            }
            break;
        case "arrowright":
        case "d":
            if (lastDirection !== 'left') {
                newDir.x = 1;
                newDir.y = 0;
                lastDirection = 'right';
            }
            break;
        default:
            moved = false;
    }

    if (moved) {
        moveSound.play();
        inputDir = newDir;
        
        // Level-specific features
        if (level >= 2) {
            // Moving obstacles
                // much rarer moving-obstacle regeneration on player move
                if (Math.random() < 0.06) {
                    generateObstacles();
                }
            
            // Teleporting food (Level 3+)
            if (level >= 3 && Math.random() < 0.1) {
                food = generateNewFood();
            }
        }
    }

    if (moved && isDevilMode) {
        // In devil mode, occasionally move obstacles when player moves (reduced chance)
        if (Math.random() < 0.12) { // ~12% chance to move obstacles
            generateObstacles();
            updateSassyBot("😈 Surprise! The obstacles are alive!", true);
        }
    }
});  

// Button event listeners
restartBtn.addEventListener('click', () => {
    // Reset game state
    snakeArray = [{ x: 13, y: 15 }];
    inputDir = { x: 0, y: 0 };
    score = 0;
    updateScore();
    food = { x: 6, y: 7 };
    speed = 6;
    isPaused = false;
    pauseBtn.textContent = 'Pause';
});

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
});

// Start the random popups
scheduleRandomPopup();

// ===== MOBILE TOUCH CONTROLS =====
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

const minSwipeDistance = 30; // Minimum distance for a swipe to register

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, false);

document.addEventListener('touchend', (e) => {
    if (isPaused) return;
    
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, false);

function handleSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Check if swipe distance is significant enough
    if (Math.abs(diffX) < minSwipeDistance && Math.abs(diffY) < minSwipeDistance) {
        return;
    }
    
    // Determine swipe direction
    if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0 && lastDirection !== 'left') {
            // Swipe right
            inputDir = { x: 1, y: 0 };
            lastDirection = 'right';
            moveSound.play();
        } else if (diffX < 0 && lastDirection !== 'right') {
            // Swipe left
            inputDir = { x: -1, y: 0 };
            lastDirection = 'left';
            moveSound.play();
        }
    } else {
        // Vertical swipe
        if (diffY > 0 && lastDirection !== 'up') {
            // Swipe down
            inputDir = { x: 0, y: 1 };
            lastDirection = 'down';
            moveSound.play();
        } else if (diffY < 0 && lastDirection !== 'down') {
            // Swipe up
            inputDir = { x: 0, y: -1 };
            lastDirection = 'up';
            moveSound.play();
        }
    }
    
    // Trigger level-specific features on mobile swipe
    if (level >= 2) {
        if (Math.random() < 0.06) {
            generateObstacles();
        }
        if (level >= 3 && Math.random() < 0.1) {
            food = generateNewFood();
        }
    }
    
    if (isDevilMode) {
        if (Math.random() < 0.12) {
            generateObstacles();
            updateSassyBot("😈 Surprise! The obstacles are alive!", true);
        }
    }
}

// ===== VIRTUAL MOBILE BUTTON CONTROLS =====
const btnUp = document.getElementById('btnUp');
const btnDown = document.getElementById('btnDown');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

function handleVirtualButton(direction) {
    if (isPaused) return;
    
    let moved = true;
    
    switch(direction) {
        case 'up':
            if (lastDirection !== 'down') {
                inputDir = { x: 0, y: -1 };
                lastDirection = 'up';
            }
            break;
        case 'down':
            if (lastDirection !== 'up') {
                inputDir = { x: 0, y: 1 };
                lastDirection = 'down';
            }
            break;
        case 'left':
            if (lastDirection !== 'right') {
                inputDir = { x: -1, y: 0 };
                lastDirection = 'left';
            }
            break;
        case 'right':
            if (lastDirection !== 'left') {
                inputDir = { x: 1, y: 0 };
                lastDirection = 'right';
            }
            break;
        default:
            moved = false;
    }
    
    if (moved) {
        moveSound.play();
        
        // Trigger level-specific features
        if (level >= 2) {
            if (Math.random() < 0.06) {
                generateObstacles();
            }
            if (level >= 3 && Math.random() < 0.1) {
                food = generateNewFood();
            }
        }
        
        if (isDevilMode && Math.random() < 0.12) {
            generateObstacles();
            updateSassyBot("😈 Surprise! The obstacles are alive!", true);
        }
    }
}

// Add event listeners to virtual buttons if they exist
if (btnUp) {
    btnUp.addEventListener('click', () => handleVirtualButton('up'));
    btnUp.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleVirtualButton('up');
    });
}

if (btnDown) {
    btnDown.addEventListener('click', () => handleVirtualButton('down'));
    btnDown.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleVirtualButton('down');
    });
}

if (btnLeft) {
    btnLeft.addEventListener('click', () => handleVirtualButton('left'));
    btnLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleVirtualButton('left');
    });
}

if (btnRight) {
    btnRight.addEventListener('click', () => handleVirtualButton('right'));
    btnRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleVirtualButton('right');
    });
}
