"use strict";

/* Define game assets */
let DEBUG = true;

const canvas = (function() {
    const canvas = document.getElementById("mainCanvas");
    canvas.width = 3750;
    canvas.height = 4450;
    const ctx = canvas.getContext("2d");
    
    return {
        ctx,
        width: canvas.width,
        height: canvas.height
    }
})();

const Asteroid = (function() {

    /* This function will always generate an irregular dodecagon. 
        The average radius scaling factor will be 0.3. However, 
        the random number is generated such as to make the 
        dodecagon hopefully more spikey.
        The final three entries of the outline array contain, 
            1. average Radius of hitbox
            2. x offset of hitbox
            3. y offset of hitbox */
    function generateOutline() {
        const dTheta = Math.PI / 6;
        const shapeOutline = [];

        let averageRadius = 0;
        let averageXOffset = 0;
        let averageYOffset = 0;

        let randomScaling, angle;
        for (let turns = 0; turns < 12; ++turns) {
            // get scaling factor...
            randomScaling = (0.5 * Math.random()) - 0.25;
            randomScaling = (randomScaling > 0) ? 
                (randomScaling + 0.65) : (-randomScaling + 0.30);
            // get angle...
            angle = (turns + Math.random() - 0.5) * dTheta;
            // store x-coord...
            shapeOutline.push(0.5 * randomScaling * Math.cos(angle));
            // store y-coord...
            shapeOutline.push(0.5 * randomScaling * Math.sin(angle));

            // update averages
            averageRadius = ((randomScaling - averageRadius) / 
                                (turns + 1)) + averageRadius;
            averageXOffset = ((shapeOutline[shapeOutline.length - 2] - 
                    averageXOffset) / (turns + 1)) + averageXOffset;
            averageYOffset = ((shapeOutline[shapeOutline.length - 1] - 
                    averageYOffset) / (turns + 1)) + averageYOffset;
        }

        shapeOutline.push(0.5 * averageRadius)
        shapeOutline.push(averageXOffset);
        shapeOutline.push(averageYOffset);
        return shapeOutline;
    }

    return class Asteroid {
        constructor(xPos = 0, yPos = 0, xVel = 0, yVel = 0, size = 8) {
            this.outline = generateOutline();

            const temp = this.outline;
            this.hitBox = {
                yOffset: temp.pop(),
                xOffset: temp.pop(),
                radius: temp.pop()
            };

            this.xPos = xPos;
            this.yPos = yPos;
            this.xVel = xVel;
            this.yVel = yVel;
            this.size = size;
        }

        updateKinematics() {
            /* TEMPORARY */
            this.xPos += this.xVel;
            this.yPos += this.yVel;


            // // This accounts for the game area looping right off screen...
            // this.xPos = ((this.xPos + this.xVel + 124) % 116) - 8;
            // this.yPos = ((this.xPos + this.yVel + 124) % 116) - 8;
        }

        // TODO... change drawing and coordinate patterns
        drawAsteroid() {
            canvas.ctx.beginPath();

            canvas.ctx.moveTo(
                this.outline[0] * 800 + this.xPos,
                this.outline[1] * 800 + this.yPos);
        
            for (let i = 1; i < 12; i++) {
                canvas.ctx.lineTo(
                    (this.outline[(2*i)] * 800) + this.xPos,
                    (this.outline[(2*i) + 1] * 800) + this.yPos);
            }
            canvas.ctx.closePath();
        
            canvas.ctx.lineWidth = 6;
            canvas.ctx.strokeStyle = "white";
            canvas.ctx.stroke();

            if (!DEBUG) return;

            canvas.ctx.beginPath();
            canvas.ctx.strokeStyle = "green";
            canvas.ctx.arc(this.xPos + (800 * this.hitBox.xOffset), 
                            this.yPos + (800 * this.hitBox.yOffset), 
                            this.hitBox.radius * 800, 
                            0, 2*Math.PI);
            canvas.ctx.stroke();
        }
    }
})();

const spawnedAsteroids = [];

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
/* Define handlers */
const handlers = (function() {
    const body = document.getElementsByTagName("body")[0];


    return {
        waitToStart() {
            body.addEventListener("keydown", (event) => {
                    //TODO...
                    console.log("hello...")
                }, {once : true})
        }
    }
})();


/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
/* Define animations */

function clearScreen() {
    canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawNextFrame() {
    // Asteroids ought to go behind other drawings...
    spawnedAsteroids.forEach( (asteroid) => {
        asteroid.drawAsteroid();
    })
}

function updateGameState() {
    spawnedAsteroids.forEach( (asteroid) => {
        asteroid.updateKinematics();
    })
}

function drawStartScreen() {
    canvas.ctx.fillStyle = "red";
    canvas.ctx.font = "225px monospace";
    canvas.ctx.fillText(
        "Type any key to start...",
        0.10 * canvas.width,
        0.50 * canvas.height,
        0.80 * canvas.width
    );

    handlers.waitToStart();
}





//drawStartScreen();


// Actual animation...
setInterval(() => {
    clearScreen();
    drawNextFrame();
    updateGameState();
}, 17);





/* Tests... */
const test = [
    //0. create an asteroid...
    function() {
        spawnedAsteroids.push(
            new Asteroid(1000, 1000, 10, 10)
        );
    }
]
