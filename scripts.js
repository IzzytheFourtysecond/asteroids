"use strict";

/* Define game assets */
const flags = {
    DEBUG: true
}

const canvas = (function() {
    const canvas = document.getElementById("mainCanvas");
    canvas.width = 3750;
    canvas.height = 4450;
    const ctx = canvas.getContext("2d");
    
    return {
        ctx,
        width: canvas.width,
        height: canvas.height,

        //convert relative lengths to pixel lengths
        xPixelsOf(relativeLength) {
            return (0.01 * relativeLength) * canvas.width;
        },
        yPixelsOf(relativeLength) {
            return (0.01 * relativeLength) * canvas.height;
        }
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
            3. y offset of hitbox 
    */
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
        constructor(xPos = 0, yPos = 0, xVel = 0, yVel = 0, size = 16) {
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
            // This accounts for the game area looping right off screen...
            this.xPos = ((this.xPos + this.xVel + 124) % 116) - 8;
            this.yPos = ((this.yPos + this.yVel + 124) % 116) - 8;
        }

        drawSelf() {
            let xPos = this.xPos;
            let yPos = this.yPos;

            canvas.ctx.beginPath();

            canvas.ctx.moveTo(
                canvas.xPixelsOf((this.outline[0] * this.size) + xPos),
                canvas.yPixelsOf((this.outline[1] * this.size) + yPos));
        
            for (let i = 1; i < 12; i++) {
                canvas.ctx.lineTo(
                    canvas.xPixelsOf((this.outline[2*i] * this.size) + xPos),
                    canvas.yPixelsOf((this.outline[(2*i) + 1] * this.size) 
                                                                    + yPos));
            }
            canvas.ctx.closePath();
        
            canvas.ctx.lineWidth = 6;
            canvas.ctx.strokeStyle = "white";
            canvas.ctx.stroke();

            if (!flags.DEBUG) return;

            canvas.ctx.beginPath();
            canvas.ctx.strokeStyle = "green";
            canvas.ctx.ellipse(
                canvas.xPixelsOf(xPos + (this.size * this.hitBox.xOffset)), 
                canvas.yPixelsOf(yPos + (this.size * this.hitBox.yOffset)), 
                canvas.xPixelsOf(this.hitBox.radius * this.size),
                canvas.yPixelsOf(this.hitBox.radius * this.size), 
                0,
                0, 2*Math.PI);
            canvas.ctx.stroke();
        }
    }
})();

const spawnedAsteroids = [];

const Player = (function() {
    return class Player {
        constructor() {
            this.xPos = 50;
            this.yPos = 50;
        }
    }
})();

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
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


/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
/* Define animations */

const actions = {
    clearScreen() {
        canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    drawNextFrame() {
        // Asteroids ought to go behind other drawings...
        spawnedAsteroids.forEach( (asteroid) => {
            asteroid.drawSelf();
        })
    },

    updateGameState() {
        spawnedAsteroids.forEach( (asteroid) => {
            asteroid.updateKinematics();
        })
    },

    drawStartScreen() {
        canvas.ctx.fillStyle = "red";
        canvas.ctx.font = "225px monospace";
        canvas.ctx.fillText(
            "Type any key to start...",
            0.10 * canvas.width,
            0.50 * canvas.height,
            0.80 * canvas.width
        );
        
        //TODO: remove this...
        handlers.waitToStart();
    },

    /* This function is intended to spawn an inderterminate number of
        asteroids with mostly random positions and velocities while meeting 
        a few criteria. Those criteria are: 
            1. Asteroids need to spawn a certain distance 
                away from the player.
            2. Asteroids must not be traveling straight at 
                the player when they spawn in.
            3. Asteroids must spawn with a specified velocity 
                magnitude.
            4. Asteroids should spawn spaced out a bit from
                each other.
    */
    initializeAsteroids(numberToSpawn, spawnVelocityMagnitude) {
        spawnedAsteroids.length = 0; // reset the asteroids list...

        let randSpawnRadius = 0;
        let randSpawnAngle = 0;
        let randVelocityAngleOffset = 0;
        for (; numberToSpawn > 0; numberToSpawn--) {
            randSpawnRadius = (30 * Math.random()) + 15;
            randSpawnAngle += (Math.PI * Math.random()) + 0.5;
            randVelocityAngleOffset = 0.75 * Math.PI * 
                                    ((2 * Math.random()) - 1);
            
            //TODO: make the asteroids spawn around player coords...
            spawnedAsteroids.push(
                new Asteroid(
                    50 + (randSpawnRadius * Math.cos(randSpawnAngle)),
                    50 + (randSpawnRadius * Math.sin(randSpawnAngle)),
                    spawnVelocityMagnitude * 
                        (Math.cos(randSpawnAngle + randVelocityAngleOffset)),
                    spawnVelocityMagnitude * 
                        (Math.sin(randSpawnAngle + randVelocityAngleOffset)),
                    16));
            // update the asteroid to address if it spawns out of bounds...
            spawnedAsteroids[spawnedAsteroids.length - 1].updateKinematics();
        }
    }
};



// Start-up stuff...
//drawStartScreen();

// Game Loop
setInterval(() => {
    actions.clearScreen();
    actions.drawNextFrame();
    actions.updateGameState();
}, 16);




/* Tests... */
const tests = [
    //0. spawn three asteroids to test drawing and kinematics...
    function() {
        spawnedAsteroids.push(
            new Asteroid(40, 90, -0.1, 0.1)
        );
        spawnedAsteroids.push(
            new Asteroid(20, 50, 0.14, 0.05)
        );
        spawnedAsteroids.push(
            new Asteroid(10, 40, 0.01, -0.17)
        );
    },

    //1. test actions.initializeAsteroids()...
    function(number) {
        actions.initializeAsteroids(number, 0.05);
    }
]
