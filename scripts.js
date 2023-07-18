"use strict";

/* Define game assets */
const flags = {
    DEBUG: false,
    isGameActive: false
}
const FRAME_RATE = 60;
const NUM_SUB_FRAMES = 4;

const v2d_math = {
    dot: (arr1, arr2) => (arr1[0] * arr2[0]) + (arr1[1] * arr2[1]),
    magnitude: (arr) => Math.sqrt((arr[0] * arr[0]) + (arr[1] * arr[1]))
}

const canvas = (function() {
    const canvas = document.getElementById("mainCanvas");
    canvas.width = 4500;
    canvas.height = 2700;
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
        }

        return shapeOutline;
    }

    return class Asteroid {
        constructor(xPos = 0, yPos = 0, xVel = 0, yVel = 0, size = 16) {
            this.outline = generateOutline();
            this.xPos = xPos;
            this.yPos = yPos;
            this.xVel = xVel;
            this.yVel = yVel;
            this.size = size;
        }

        updateKinematics() {
            const SEC_PER_SUBFRAME = 1 / (FRAME_RATE * NUM_SUB_FRAMES);

            // This accounts for the game area looping right off screen...
            this.xPos = ((this.xPos + (SEC_PER_SUBFRAME * this.xVel) 
                                                        + 124) % 116) - 8;
            this.yPos = ((this.yPos + (SEC_PER_SUBFRAME * this.yVel) 
                                                        + 124) % 116) - 8;
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
                canvas.xPixelsOf(xPos), canvas.yPixelsOf(yPos), 
                canvas.xPixelsOf((0.46 * this.size) + 2),
                canvas.yPixelsOf((0.46 * this.size) + 2), 
                0, 0, 2*Math.PI);
            canvas.ctx.stroke();
        }

        static spawnedAsteroids = [];
    }
})();

const Player = (function() {
    return class Player {
        constructor() {
            this.xPos = 50;
            this.yPos = 50;
            this.angle = 0;
            this.xVel = 0;
            this.yVel = 0;
            this.xAcc = 0;
            this.yAcc = 0;
            this.isAccelerating = false;
            this.controller = null;

            /* The following is given by 
                handlers.receiveMovementInputs():
                
                this.controller = {
                    activeInputs = [false, false, false],
                    receiveKeyDowns = (event) => {...},
                    receiveKeyUps = (event) => {...}
                }
            */
        }

        updateKinematics() {
            const SEC_PER_SUBFRAME = 1 / (FRAME_RATE * NUM_SUB_FRAMES);

            if (this.controller) {
                this.angle = (this.angle + (2 * Math.PI) +
                        (this.controller.activeInputs[0] * 0.025) -
                        (this.controller.activeInputs[1] * 0.025)
                    ) % (2 * Math.PI);
                
                this.isAccelerating = this.controller.activeInputs[2];
                this.xAcc = 16 * this.controller.activeInputs[2] *
                    -Math.sin(this.angle);
                this.yAcc = 16 * this.controller.activeInputs[2] * 
                    -Math.cos(this.angle);
            }

            this.xVel += (SEC_PER_SUBFRAME * this.xAcc);
            this.yVel += (SEC_PER_SUBFRAME * this.yAcc);

            // Trying to add some friction to make the game more playable...
            this.xVel -= 0.001 * this.xVel;
            this.yVel -= 0.001 * this.yVel;

            // This accounts for the game area looping right off screen...
            this.xPos = ((this.xPos + (SEC_PER_SUBFRAME * this.xVel) 
                                                        + 124) % 116) - 8;
            this.yPos = ((this.yPos + (SEC_PER_SUBFRAME * this.yVel) 
                                                        + 124) % 116) - 8;
        }

        drawSelf() {
            let xPos = this.xPos;
            let yPos = this.yPos;
            let angle = this.angle;
            let isAccelerating = this.isAccelerating;

            // This is to use a rotation matrix...
            let cosAngle = Math.cos(angle);
            let sinAngle = Math.sin(angle);
            let rotateX = (x, y) => (x * cosAngle) + (y * sinAngle);
            let rotateY = (x, y) => (y * cosAngle) - (x * sinAngle);

            // This draws the main ship body...
            canvas.ctx.beginPath();
            canvas.ctx.moveTo(
                canvas.xPixelsOf(xPos + rotateX(-0.5, 1)),
                canvas.yPixelsOf(yPos + rotateY(-0.5, 1)));
            canvas.ctx.lineTo(
                canvas.xPixelsOf(xPos + rotateX(0, -1)),
                canvas.yPixelsOf(yPos + rotateY(0, -1)));
            canvas.ctx.lineTo(
                canvas.xPixelsOf(xPos + rotateX(0.5, 1)),
                canvas.yPixelsOf(yPos + rotateY(0.5, 1)));
            canvas.ctx.moveTo(
                canvas.xPixelsOf(xPos + rotateX(-0.4, 0.6)),
                canvas.yPixelsOf(yPos + rotateY(-0.4, 0.6)));
            canvas.ctx.lineTo(
                canvas.xPixelsOf(xPos + rotateX(0.4, 0.6)),
                canvas.yPixelsOf(yPos + rotateY(0.4, 0.6)));
            canvas.ctx.lineWidth = 6;
            canvas.ctx.strokeStyle = "white";
            canvas.ctx.stroke();

            // This draws engine flame...
            if (isAccelerating) {
                canvas.ctx.beginPath();
                canvas.ctx.moveTo(
                    canvas.xPixelsOf(xPos + rotateX(-0.4, 0.6)),
                    canvas.yPixelsOf(yPos + rotateY(-0.4, 0.6)));
                canvas.ctx.lineTo(
                    canvas.xPixelsOf(xPos + rotateX(0.4, 0.6)),
                    canvas.yPixelsOf(yPos + rotateY(0.4, 0.6)));
                canvas.ctx.lineTo(
                    canvas.xPixelsOf(xPos + rotateX(0, 2)),
                    canvas.yPixelsOf(yPos + rotateY(0, 2)));
                canvas.ctx.closePath();
                canvas.ctx.fillStyle = "white";
                canvas.ctx.fill();
            }

            if (!flags.DEBUG) return;

            // orange is +x-direction
            canvas.ctx.beginPath();
            canvas.ctx.moveTo(
                canvas.xPixelsOf(xPos),
                canvas.yPixelsOf(yPos));
            canvas.ctx.lineTo(
                canvas.xPixelsOf(xPos + 5),
                canvas.yPixelsOf(yPos));
            canvas.ctx.strokeStyle = "orange";
            canvas.ctx.stroke();
            
            // cyan is +y-direction
            canvas.ctx.beginPath();
            canvas.ctx.moveTo(
                canvas.xPixelsOf(xPos),
                canvas.yPixelsOf(yPos));
            canvas.ctx.lineTo(
                canvas.xPixelsOf(xPos),
                canvas.yPixelsOf(yPos + 5));
            canvas.ctx.strokeStyle = "cyan";
            canvas.ctx.stroke();
        }

        static lives = [];
    }
})();

const Bullet = (function() {

    /* This is a ring buffer meant to help the class function...*/
    const capacity = 6; //note: actual capacity is actually one less...
    const bullets = new Array(capacity).fill(null);
    let readIndex = 0;
    let writeIndex = 0;

    const removeBullet = function() {
        bullets[readIndex] = null;
        readIndex = (readIndex + 1) % capacity;
    };

    return class Bullet {
        constructor(player) {
            if ((writeIndex + 1) % (capacity) == readIndex) {
                throw new Error("Can't shoot more than five at a time...")
            }
            
            let xPosTemp = player.xPos;
            let yPosTemp = player.yPos;
            let xVelTemp = player.xVel;
            let yVelTemp = player.yVel;

            let angleTemp = player.angle;
            let cosAngle = Math.cos(angleTemp);
            let sinAngle = Math.sin(angleTemp);
            let xVelHat = ((x, y) => (x * cosAngle) + (y * sinAngle))(0, -1);
            let yVelHat = ((x, y) => (y * cosAngle) - (x * sinAngle))(0, -1);
            let speed = 20 + 
                (v2d_math.dot([xVelHat, yVelHat], [xVelTemp, yVelTemp]));

            this.xPos = xPosTemp + xVelHat;
            this.yPos = yPosTemp + yVelHat;
            this.xVel = speed * xVelHat;
            this.yVel = speed * yVelHat;
            this.framesLeft = 180 * NUM_SUB_FRAMES;

            bullets[writeIndex] = this;
            writeIndex = (writeIndex + 1) % capacity;

            // recoil on the ship...
            player.xVel = player.xVel - (0.05 * this.xVel);
            player.yVel = player.yVel - (0.05 * this.yVel);
        }

        // Right now this could be a private method...
        updateKinematics() {
            const SEC_PER_SUBFRAME = 1 / (FRAME_RATE * NUM_SUB_FRAMES);

            // This accounts for the game area looping right off screen...
            this.xPos = ((this.xPos + (SEC_PER_SUBFRAME * this.xVel) 
                                                        + 124) % 116) - 8;
            this.yPos = ((this.yPos + (SEC_PER_SUBFRAME * this.yVel) 
                                                        + 124) % 116) - 8;
            if (--this.framesLeft == 0)
                removeBullet();
        }

        static update() {
            bullets.forEach( (bullet) => {
                //!(bullet) is used to check for nulls...
                !(bullet) || bullet.updateKinematics();
            });
        }

        // Right now this could be a private method...
        drawSelf() {
            let xPos = this.xPos;
            let yPos = this.yPos;

            canvas.ctx.beginPath();
            canvas.ctx.ellipse(
                canvas.xPixelsOf(xPos), canvas.yPixelsOf(yPos), 
                canvas.xPixelsOf(0.25),
                canvas.yPixelsOf(0.25), 
                0, 0, 2*Math.PI);
            canvas.ctx.fillStyle = "white";
            canvas.ctx.fill();
        }

        static drawBullets() {
            bullets.forEach( (bullet) => {
                //!(bullet) is used to check for nulls...
                !(bullet) || bullet.drawSelf();
            });
        }
    };
})();

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
/* Define handlers */
const handlers = (function() {
    
    return {
        receiveMovementInputs() {

            // Ownership of handeling the inputs should be passed to the
            // player object. The function doesn't use keyword "this" 
            // however because the functions are being called by an 
            // event handler rather than the player object. So "this" would 
            // not be tied to the intended object.
            let that = (Player.lives[0].controller = {});
            that.activeInputs = [false, false, false];
            that.receiveKeyDowns = (event) => {
                switch(event.key) {
                    case 'ArrowLeft':
                        that.activeInputs[0] = true;
                        break;
                    case 'ArrowRight':
                        that.activeInputs[1] = true;
                        break;
                    case 'ArrowUp':
                        that.activeInputs[2] = true;
                        break;
                    case ' ':
                        try {new Bullet(Player.lives[0])}
                        catch(err) {
                            if (flags.DEBUG) console.log(err.message);
                        }
                        break;
                }
            }
            that.receiveKeyUps = (event) => {
                switch(event.key) {
                    case 'ArrowLeft':
                        that.activeInputs[0] = false;
                        break;
                    case 'ArrowRight':
                        that.activeInputs[1] = false;
                        break;
                    case 'ArrowUp':
                        that.activeInputs[2] = false;
                        break;
                }
            }
            
            window.addEventListener("keydown", that.receiveKeyDowns);
            window.addEventListener("keyup", that.receiveKeyUps);

            //TODO... call something to initialize collision...
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
        Asteroid.spawnedAsteroids.forEach( (asteroid) => {
            asteroid.drawSelf();
        });

        //TODO: bullets and ufos
        Bullet.drawBullets();

        //Should be drawn second to last
        Player.lives.forEach( (ship) => {
            ship.drawSelf();
        });
    },

    updateGameState() {
        Asteroid.spawnedAsteroids.forEach( (asteroid) => {
            asteroid.updateKinematics();
        });

        if (flags.isGameActive) {
            Player.lives[0].updateKinematics();
        }

        Bullet.update();
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
        Asteroid.spawnedAsteroids.length = 0; // reset the asteroids list...

        let randSpawnRadius = 0;
        let randSpawnAngle = 0;
        let randVelocityAngleOffset = 0;
        for (; numberToSpawn > 0; numberToSpawn--) {
            randSpawnRadius = (30 * Math.random()) + 15;
            randSpawnAngle += (Math.PI * Math.random()) + 0.5;
            randVelocityAngleOffset = 0.75 * Math.PI * 
                                    ((2 * Math.random()) - 1);
            
            //TODO: make the asteroids spawn around player coords...
            Asteroid.spawnedAsteroids.push(
                (new Asteroid(
                    50 + (randSpawnRadius * Math.cos(randSpawnAngle)),
                    50 + (randSpawnRadius * Math.sin(randSpawnAngle)),
                    spawnVelocityMagnitude * 
                        (Math.cos(randSpawnAngle + randVelocityAngleOffset)),
                    spawnVelocityMagnitude * 
                        (Math.sin(randSpawnAngle + randVelocityAngleOffset)),
                    16)));
            // update the asteroid to address if it spawns out of bounds...
            Asteroid.spawnedAsteroids[Asteroid.spawnedAsteroids.length 
                                                    - 1].updateKinematics();
        }
    },

    initializePlayers() {
        Player.lives.length = 0;
        flags.isGameActive = true;

        Player.lives.push(new Player());
        handlers.receiveMovementInputs();

        //TODO: more lives in corner later...
    }
};



// Start-up stuff...
//actions.drawStartScreen();

// Game Loop
setInterval(() => {
    actions.clearScreen();
    actions.drawNextFrame();
    for (let i = 0; i < NUM_SUB_FRAMES; ++i) {
        actions.updateGameState();
    }
}, Math.floor(1000 / FRAME_RATE));




/* Tests... */
const tests = [
    //0. spawn three asteroids to test drawing and kinematics...
    function() {
        Asteroid.spawnedAsteroids.push(
            new Asteroid(40, 90, -0.1, 0.1)
        );
        Asteroid.spawnedAsteroids.push(
            new Asteroid(20, 50, 0.14, 0.05)
        );
        Asteroid.spawnedAsteroids.push(
            new Asteroid(10, 40, 0.01, -0.17)
        );
    },

    //1. test actions.initializeAsteroids()...
    function(number) {
        actions.initializeAsteroids(number, 4);
    },

    //2. spawn a player...
    function() {
        actions.initializePlayers();
    }
]
