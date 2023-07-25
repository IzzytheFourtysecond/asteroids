"use strict";

// Important note: my tab size is equivalent to four spaces...

/* Define environment helper resources. */
const flags = {
    DEBUG: false,
    isGameActive: false
}
const FRAME_RATE = 60;
const NUM_SUB_FRAMES = 4;

const v2d_math = {
    dot: (arr1, arr2) => (arr1[0] * arr2[0]) + (arr1[1] * arr2[1]),

    cross: (arr1, arr2) => ((arr1[0] * arr2[1]) - (arr1[1] * arr2[0])),

    magnitude: (arr) => Math.sqrt((arr[0] * arr[0]) + (arr[1] * arr[1])),

    //b1 and b2 are starting vectors, m1 and m2 are slope vectors...
    //Not sure if this is used...
    doLineSegmentsCross(b1, m1, b2, m2) {
        let temp1 = this.cross(m1, [b2[0] - b1[0], b2[1] - b1[1]]);
        let temp2 = this.cross(m2, [b1[0] - b2[0], b1[1] - b2[1]]);
        let temp3 = this.cross(m1, m2);
        return (temp1 * (temp1 + temp3) <= 0) && 
            (temp2 * (temp2 - temp3) <= 0);
    },

    // b and m define the line, a1 and a2 are point vectors...
    // Not sure if this is used...
    arePointsOnSameSideOfLine(b, m, a1, a2) {
        let temp1 = [a1[0] - b[0], a1[1] - b[1]];
        let temp2 = [a2[0] - b[0], a2[1] - b[1]];
        return (this.cross(m * temp1) * this.cross(m * temp2)) >= 0;
    }
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

        // convert relative lengths to pixel lengths
        xPixelsOf(relativeLength) {
            return (0.01 * relativeLength) * canvas.width;
        },
        yPixelsOf(relativeLength) {
            return (0.01 * relativeLength) * canvas.height;
        }
    }
})();

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
/* Define particle effects */

/* The process: other assets specify their desired particle effects. 
    However, this class through a private class or several actually 
    creates the effects and then stores and draws them.

    Format for defining particles:
         {type: "particle type", options: {...}}
    
    Each effect is stored as an iterator. */
const ParticleEffectsManager = (function() {

    /* Line options format:
        {   
            // First end of line segment... ( Required )
            b1x: number,
            b1y: number,
            
            // Second end of line segment... ( Required )
            b2x: number,
            b2y: number,

            // how far along the line the pivot is... ( Required )
            t: number, // if t is in [0, 1], the pivot is inside the line

            // velocity properties... ( Required )
            xVel: number,
            yVel: number,
            angularVel: number,

            // frames to draw... ( Required )
            framesLeft: number 
        }
    */
    class lineParticle {
        constructor(options) {
            this.xEnd1 = options.b1x;
            this.yEnd1 = options.b1y;
            this.xEnd2 = options.b2x;
            this.yEnd2 = options.b2y;
            this.xVel = options.xVel;
            this.yVel = options.yVel;

            // This is to rotate the particle...
            this.xPivot = options.t * (this.xEnd2 - this.xEnd1) + 
                                                            this.xEnd1;
            this.yPivot = options.t * (this.yEnd2 - this.yEnd1) + 
                                                            this.yEnd1;
            let angleChange =  options.angularVel / FRAME_RATE;
            let cosAngle = Math.cos(angleChange);
            let sinAngle = Math.sin(angleChange);
            this.rotateX = (x, y) => (x * cosAngle) + (y * sinAngle);
            this.rotateY = (x, y) => (y * cosAngle) - (x * sinAngle);

            this.framesLeft = options.framesLeft;
        }

        next() {
            const SEC_PER_FRAME = 1 / (FRAME_RATE);
            // translational update
            this.xEnd1 += this.xVel * SEC_PER_FRAME;
            this.xEnd2 += this.xVel * SEC_PER_FRAME;
            this.xPivot += this.xVel * SEC_PER_FRAME;
            this.yEnd1 += this.yVel * SEC_PER_FRAME;
            this.yEnd2 += this.yVel * SEC_PER_FRAME;
            this.yPivot += this.yVel * SEC_PER_FRAME;
            // rotational update
            this.xEnd1 = this.xPivot + this.rotateX(this.xEnd1 - 
                this.xPivot, this.yEnd1 - this.yPivot);
            this.yEnd1 = this.yPivot + this.rotateY(this.xEnd1 - 
                this.xPivot, this.yEnd1 - this.yPivot);
            this.xEnd2 = this.xPivot + this.rotateX(this.xEnd2 - 
                this.xPivot, this.yEnd2 - this.yPivot);
            this.yEnd2 = this.yPivot + this.rotateY(this.xEnd2 - 
                this.xPivot, this.yEnd2 - this.yPivot);
            
            --this.framesLeft;

            return {value: this, done: this.framesLeft < 0};
        }

        draw() {
            canvas.ctx.strokeStyle = "white";
            canvas.ctx.lineWidth = 6;

            canvas.ctx.beginPath();
            canvas.ctx.moveTo(canvas.xPixelsOf(this.xEnd1),
                            canvas.yPixelsOf(this.yEnd1));
            canvas.ctx.lineTo(canvas.xPixelsOf(this.xEnd2),
                            canvas.yPixelsOf(this.yEnd2));
            canvas.ctx.stroke();
        }
    }

    // Linked list that is looped through...
    let effectsToDraw = {
        iterator: null,
        next: {
            iterator: null,
            next: null
        }
    };

    return {
        createEffect(particleDefinition) {
            let effect = null;
            switch (particleDefinition.type) {
                case "line":
                    effect = new lineParticle(particleDefinition.options);
                    break;
                // TODO... add point partricle
                default:
                    if (flags.DEBUG) console.log("Invalid effect type.");
                    return;
            }

            let newNode = {iterator: effect, next: effectsToDraw.next};
            effectsToDraw.next = newNode;
        },

        drawEffects() {
            let previous = effectsToDraw;
            let current = effectsToDraw.next;
            let temp = null;

            while (current.next) {
                temp = current.iterator.next();
                temp.value.draw();
                if (temp.done) {
                    previous.next = current.next;
                    current.next = null; // maybe helps garbage collection
                    current = previous.next;
                }
                else {
                    previous = current;
                    current = current.next;
                }
            }
        }
    }
})();

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
/* Define game assets...*/

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
            const offScreen = 0.5 * this.size;

            // This accounts for the game area looping right off screen...
            this.xPos = ((this.xPos + (SEC_PER_SUBFRAME * this.xVel) + 
                (100 + (3 * offScreen))) % (100 + 2 * offScreen)) - offScreen;
            this.yPos = ((this.yPos + (SEC_PER_SUBFRAME * this.yVel) +
                (100 + (3 * offScreen))) % (100 + 2 * offScreen)) - offScreen;
        }

        drawSelf() {
            let xPos = this.xPos;
            let yPos = this.yPos;

            canvas.ctx.beginPath();

            canvas.ctx.moveTo(
                canvas.xPixelsOf((this.outline[0] * this.size) + xPos),
                canvas.yPixelsOf((this.outline[1] * this.size) + yPos));
        
            for (let i = 1; i < 12; ++i) {
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

            // weak hitbox
            canvas.ctx.beginPath();
            canvas.ctx.strokeStyle = "green";
            canvas.ctx.ellipse(
                canvas.xPixelsOf(xPos), canvas.yPixelsOf(yPos), 
                canvas.xPixelsOf((0.46 * this.size) + 2),
                canvas.yPixelsOf((0.46 * this.size) + 2), 
                0, 0, 2*Math.PI);
            canvas.ctx.stroke();

            // center
            canvas.ctx.beginPath();
            canvas.ctx.fillStyle = "green";
            canvas.ctx.ellipse(
                canvas.xPixelsOf(xPos), canvas.yPixelsOf(yPos), 
                canvas.xPixelsOf(0.5),
                canvas.yPixelsOf(0.5), 
                0, 0, 2*Math.PI);
            canvas.ctx.fill();

            // vertices
            for (let i = 0; i < 12; ++i) {
                canvas.ctx.beginPath();
                canvas.ctx.ellipse(
                    canvas.xPixelsOf((this.outline[2*i] * this.size) + xPos), 
                    canvas.yPixelsOf((this.outline[(2*i) + 1] * this.size)
                                                                    + yPos), 
                    canvas.xPixelsOf(0.5),
                    canvas.yPixelsOf(0.5), 
                    0, 0, 2*Math.PI);
                canvas.ctx.fill()
            }
        }

        static weakCollisionDetect(asset) {

            let asteroid = null;
            for (let i = 0; i < Asteroid.spawnedAsteroids.length; ++i) {
                asteroid = Asteroid.spawnedAsteroids[i];

                // maybe rework calculating distance?
                if (v2d_math.magnitude([asset.xPos - asteroid.xPos, 
                                        asset.yPos - asteroid.yPos]) 
                                        > (0.46 * asteroid.size) + 2) {
                    continue;
                }

                // more intensive collision detection...
                if (asset.strongCollisionAsteroid(asteroid)) {

                    Asteroid.spawnedAsteroids.splice(i, 1);
                    asteroid.breakApart(asset);
                    return true;
                }
            }

            return false;
        }

        breakApart(asset) {
            
            if (this.size == 4) return;

            // Get a unit vector of how far the bullet was from the center.
            let blastX = this.xPos - asset.xPos;
            let blastY = this.yPos - asset.yPos;
            let magnitudeRecip = 1 / v2d_math.magnitude([blastX, 
                                                            blastY]);
            blastX *= magnitudeRecip;
            blastY *= magnitudeRecip;

            // Scale the unit vector by other thing's speed**.
            let assetSpeed = v2d_math.magnitude([asset.xVel, asset.yVel]);
            blastX *= assetSpeed * 0.1;
            blastY *= assetSpeed * 0.1;
            
            // Will be used to add randomness to velocity of new asteroids.
            let randomAngle = Math.random() * 0.33 * Math.PI;
            let rotateX = (x, y, angle) => (x * Math.cos(angle)) + 
                                                    (y * Math.sin(angle));
            let rotateY = (x, y, angle) => (y * Math.cos(angle)) - 
                                                    (x * Math.sin(angle));
            
            // Spawn one asteroid...
            Asteroid.spawnedAsteroids.push(
                (new Asteroid(
                    this.xPos, this.yPos,
                    this.xVel + rotateX(blastX, blastY, randomAngle) + 
                                                (asset.xVel * 0.1),
                    this.yVel + rotateY(blastX, blastY, randomAngle) + 
                                                (asset.yVel * 0.1),
                    0.5 * this.size
                )));
            for (let i = 0; i < 8; ++i) {
                Asteroid.spawnedAsteroids[Asteroid.spawnedAsteroids.length 
                                                    - 1].updateKinematics();
            }

            // Spawn a second asteroid...
            Asteroid.spawnedAsteroids.push(
                (new Asteroid(
                    this.xPos, this.yPos,
                    this.xVel + rotateX(blastX, blastY, -randomAngle) + 
                                                (asset.xVel * 0.1),
                    this.yVel + rotateY(blastX, blastY, -randomAngle) + 
                                                (asset.yVel * 0.1),
                    0.5 * this.size
                )));
            for (let i = 0; i < 8; ++i) {
                Asteroid.spawnedAsteroids[Asteroid.spawnedAsteroids.length 
                                                    - 1].updateKinematics();
            }
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

            // Set to true briefly in the event of a collision.
            this.pauseDrawing = false;

            /* The following is given by 
                handlers.receiveMovementInputs():
                
                this.controller = {
                    activeInputs = [false, false, false],
                    receiveKeyDowns = (event) => {...},
                    receiveKeyUps = (event) => {...},
                    pauseReceiving = (milleseconds) => {...}
                }
            */
        }

        updateKinematics() {
            // skips updating if ship just exploded...
            if (this.pauseDrawing) return;

            const SEC_PER_SUBFRAME = 1 / (FRAME_RATE * NUM_SUB_FRAMES);
            const offScreen = 2;

            if (this.controller) {
                this.angle = (this.angle + (2 * Math.PI) +
                    (this.controller.activeInputs[0] * 5 * SEC_PER_SUBFRAME) -
                    (this.controller.activeInputs[1] * 5 * SEC_PER_SUBFRAME)
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
            this.xVel -= 0.6 * SEC_PER_SUBFRAME * this.xVel;
            this.yVel -= 0.6 * SEC_PER_SUBFRAME * this.yVel;

            // This accounts for the game area looping right off screen...
            this.xPos = ((this.xPos + (SEC_PER_SUBFRAME * this.xVel) + 
                (100 + (3 * offScreen))) % (100 + 2 * offScreen)) - offScreen;
            this.yPos = ((this.yPos + (SEC_PER_SUBFRAME * this.yVel) +
                (100 + (3 * offScreen))) % (100 + 2 * offScreen)) - offScreen;
        }

        drawSelf() {
            if (this.pauseDrawing) return;

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

            if (!flags.DEBUG || !this.controller) return;

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

        static detectCollisions() {
            if (flags.isGameActive) {
                let player = Player.lives[0];

                // Don't do collision detection on something not visible...
                if (player.pauseDrawing) return;

                // check for collisions with asteroids...
                if (Asteroid.weakCollisionDetect(player)) {
                    player.selfDestruct();
                }
            }
        }

        /* Should only be called by Player.lives[0]. */
        selfDestruct() {

            // ship coming apart callback...
            let rotateX = (x, y, angle) => (x * Math.cos(angle)) + 
                                                    (y * Math.sin(angle));
            let rotateY = (x, y, angle) => (y * Math.cos(angle)) - 
                                                    (x * Math.sin(angle));
            ParticleEffectsManager.createEffect({
                type: "line",
                options: {   
                    b1x: this.xPos + rotateX(-0.5, 1, this.angle),
                    b1y: this.yPos + rotateY(-0.5, 1, this.angle),
                    b2x: this.xPos + rotateX(-0.25, 0, this.angle),
                    b2y: this.yPos + rotateY(-0.25, 0, this.angle),
                    t: 0.5,
                    xVel: this.xVel + rotateX(2, 0, 
                                            this.angle + (0.5 * Math.PI)),
                    yVel: this.yVel + rotateY(2, 0, 
                                            this.angle + (0.5 * Math.PI)),
                    angularVel: 1,
                    framesLeft: 600
                }
            });
            ParticleEffectsManager.createEffect({
                type: "line",
                options: {   
                    b1x: this.xPos + rotateX(-0.25, 0, this.angle),
                    b1y: this.yPos + rotateY(-0.25, 0, this.angle),
                    b2x: this.xPos + rotateX(0, -1, this.angle),
                    b2y: this.yPos + rotateY(0, -1, this.angle),
                    t: 0.5,
                    xVel: this.xVel + rotateX(2, 0, 
                                            this.angle + (0.5 * Math.PI)),
                    yVel: this.yVel + rotateY(2, 0, 
                                            this.angle + (0.5 * Math.PI)),
                    angularVel: 1,
                    framesLeft: 600
                }
            });
            ParticleEffectsManager.createEffect({
                type: "line",
                options: {   
                    b1x: this.xPos + rotateX(0.5, 1, this.angle),
                    b1y: this.yPos + rotateY(0.5, 1, this.angle),
                    b2x: this.xPos + rotateX(0.25, 0, this.angle),
                    b2y: this.yPos + rotateY(0.25, 0, this.angle),
                    t: 0.5,
                    xVel: this.xVel + rotateX(2, 0, this.angle),
                    yVel: this.yVel + rotateY(2, 0, this.angle),
                    angularVel: -1,
                    framesLeft: 600
                }
            });
            ParticleEffectsManager.createEffect({
                type: "line",
                options: {   
                    b1x: this.xPos + rotateX(0.25, 0, this.angle),
                    b1y: this.yPos + rotateY(0.25, 0, this.angle),
                    b2x: this.xPos + rotateX(0, -1, this.angle),
                    b2y: this.yPos + rotateY(0, -1, this.angle),
                    t: 0.5,
                    xVel: this.xVel + rotateX(2, 0, this.angle),
                    yVel: this.yVel + rotateY(2, 0, this.angle),
                    angularVel: -1,
                    framesLeft: 600
                }
            });
            ParticleEffectsManager.createEffect({
                type: "line",
                options: {   
                    b1x: this.xPos + rotateX(-0.4, 0.6, this.angle),
                    b1y: this.yPos + rotateY(-0.4, 0.6, this.angle),
                    b2x: this.xPos + rotateX(0.4, 0.6, this.angle),
                    b2y: this.yPos + rotateY(0.4, 0.6, this.angle),
                    t: 0.5,
                    xVel: this.xVel + rotateX(2, 0, 
                                            this.angle + (1.5 * Math.PI)),
                    yVel: this.yVel + rotateY(2, 0,
                                            this.angle + (1.5 * Math.PI)),
                    angularVel: 0,
                    framesLeft: 600
                }
            });

            // Pause drawing...
            const milleseconds = 3000;
            this.controller.pauseReceiving(milleseconds);
            this.pauseDrawing = true;
            setTimeout(() => {
                Player.lives[0].pauseDrawing = false;
            }, milleseconds);

            this.xPos = 50;
            this.yPos = 50;
            this.xVel = 0;
            this.yVel = 0;
            this.xAcc = 0;
            this.yAcc = 0;

            //Update lives:
            if (Player.lives.length > 1) {
                Player.lives.pop();
                return;
            }
            //TODO... Deal with ending game potentially down here...
        }

        strongCollisionAsteroid(asteroid) {

            /* This function works by solving for three coefficients
                (c1, c2, and c3) as functions of time described by the
                matrix vector equation: 
                     _       _  _  _      _             _
                    |vx wx  0 || c1 |    | bx + (mx * t) |
                    |vy wy  0 || c2 | == | by + (my * t) |
                    |_1  1  1_||_c3_|    |_      1      _|
                
                Through some manipulations, we get three linear functions
                of t for c1, c2, and c3. Because of the setup, 
                c1 + c2 + c3 == 1. Thus, if all three are positive over
                some interval inside [t == 0, t == 1], the line segment 
                defined by initial position vector (bx, by) and slope 
                vector (mx, my) intersects the triangle with vertices: 
                (0,0), (vx, vy), and (wx, wy). */
            function doesLineSegInterceptTriangle(v1, v2, b, m) {
                // Store a strategic cross product...
                let temp1 = v2d_math.cross(v1, v2);
                let flipSign = (temp1 < 0);

                // Define some strategic lines:
                // c1(t) = alph[0] + beta[0]t
                // c2(t) = alph[1] + beta[1]t
                // c3(t) = alph[2] + beta[2]t
                const alph = new Array(3).fill(0);
                const beta = new Array(3).fill(0);
                alph[0] = v2d_math.cross(b, v2);
                beta[0] = v2d_math.cross(m, v2);
                alph[1] = v2d_math.cross(v1, b);
                beta[1] = v2d_math.cross(v1, m);
                alph[2] = temp1 - alph[0] - alph[1];
                beta[2] = -(beta[0] + beta[1]);

                const minima = [0];
                const maxima = [1];
                for (let i = 0; i < 3; i++) {
                    let temp2 = [Infinity, -(alph[i]/beta[i]), -Infinity];
                    if ((beta[i] < 0) == flipSign) temp2.pop();
                    minima.push(temp2.pop());
                    maxima.push(temp2.pop()); 
                }

                // True if there is a shared domain with a positive range...
                return Math.max(...minima) < Math.min(...maxima);
            }

            // reused constants
            let xDisplacement = this.xPos - asteroid.xPos;
            let yDisplacement = this.yPos - asteroid.yPos;
            let size = asteroid.size;

            // For applying a rotation matrix
            let cosAngle = Math.cos(this.angle);
            let sinAngle = Math.sin(this.angle);
            const rotateX = (x, y) => (x * cosAngle) + (y * sinAngle);
            const rotateY = (x, y) => (y * cosAngle) - (x * sinAngle);

            let v1 = [size * asteroid.outline[22],
                        size * asteroid.outline[23]];
            let v2 = [size * asteroid.outline[0],
                        size * asteroid.outline[1]];
            let i = 0;
            do {
                //line seg 1: left side
                let b = [xDisplacement + rotateX(-0.5, 1),
                        yDisplacement + rotateY(-0.5, 1)];
                let m = [rotateX(0.5, -2), rotateY(0.5, -2)];
                if (doesLineSegInterceptTriangle(v1, v2, b, m)) return true;
                
                //line seg 2: right side
                b = [xDisplacement + rotateX(0, -1),
                    yDisplacement + rotateY(0, -1)];
                m = [rotateX(0.5, 2), rotateY(0.5, 2)];
                if (doesLineSegInterceptTriangle(v1, v2, b, m)) return true;
                
                //line seg 3: back side
                b = [xDisplacement + rotateX(-0.4, 0.6),
                    yDisplacement + rotateY(-0.4, 0.6)];
                m = [rotateX(0.8, 0), rotateY(0.8, 0)];
                if (doesLineSegInterceptTriangle(v1, v2, b, m)) return true;

                // prepare for next loop:
                v1 = [size * asteroid.outline[(2*i)],
                        size * asteroid.outline[(2*i) + 1]];
                v2 = [size * asteroid.outline[(2*i) + 2],
                        size * asteroid.outline[(2*i) + 3]];
                ++i;
            } while (i < 11);
            return false;
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

            // Bullet kinematics...
            this.xPos = xPosTemp + xVelHat;
            this.yPos = yPosTemp + yVelHat;
            this.xVel = speed * xVelHat;
            this.yVel = speed * yVelHat;

            // This is to be used as a cooldown for spawning...
            this.framesLeft = 180 * NUM_SUB_FRAMES;

            // Used when handeling collisions...
            this.alreadyCollided = false;
            this.explosionFramesLeft = 10;

            bullets[writeIndex] = this;
            writeIndex = (writeIndex + 1) % capacity;

            // recoil on the ship...
            player.xVel = player.xVel - (0.05 * this.xVel);
            player.yVel = player.yVel - (0.05 * this.yVel);
        }

        // Right now this could be a private method...
        updateKinematics() {

            if (!this.alreadyCollided) {
                const SEC_PER_SUBFRAME = 1 / (FRAME_RATE * NUM_SUB_FRAMES);
                const offScreen = 8

                // This accounts for the game area looping right off screen...
                this.xPos = ((this.xPos + (SEC_PER_SUBFRAME * this.xVel) + 
                                        (100 + (3 * offScreen))) % 
                                        (100 + 2 * offScreen)) - offScreen;
                this.yPos = ((this.yPos + (SEC_PER_SUBFRAME * this.yVel) +
                                        (100 + (3 * offScreen))) % 
                                        (100 + 2 * offScreen)) - offScreen;
            }

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

            if (!this.alreadyCollided) {
                canvas.ctx.beginPath();
                canvas.ctx.ellipse(
                    canvas.xPixelsOf(xPos), canvas.yPixelsOf(yPos), 
                    canvas.xPixelsOf(0.25), canvas.yPixelsOf(0.25), 
                    0, 0, 2*Math.PI);
                canvas.ctx.fillStyle = "white";
                canvas.ctx.fill();
                return;
            }

            if (--this.explosionFramesLeft > 0) {
                canvas.ctx.beginPath();
                canvas.ctx.ellipse(
                    canvas.xPixelsOf(xPos), canvas.yPixelsOf(yPos), 
                    canvas.xPixelsOf(1), canvas.yPixelsOf(1), 
                    0, 0, 2*Math.PI);
                canvas.ctx.fillStyle = "white";
                canvas.ctx.fill();
            }

        }

        static drawBullets() {
            bullets.forEach( (bullet) => {
                //!(bullet) is used to check for nulls...
                !(bullet) || bullet.drawSelf();
            });
        }

        static detectCollisions() {
            for (let bullet of bullets) {
                if (!bullet || bullet.alreadyCollided) continue;

                // check for collisions with asteroids...
                if (Asteroid.weakCollisionDetect(bullet)) {
                    bullet.alreadyCollided = true;
                    continue;
                }
            }
        }

        /* Algorithm: construct a convex hull using neighboring
            vertices of the asteroids. Then test if the bullet
            is inside the hull by solving for the coefficients
            of the linear combination of the vertex vectors
            which equal the bullet's displacement.*/
        strongCollisionAsteroid(asteroid) {            
            let displacement = [this.xPos - asteroid.xPos,
                                this.yPos - asteroid.yPos];
            let size = asteroid.size;

            let v1 = [size * asteroid.outline[22],
                        size * asteroid.outline[23]];
            let v2 = [size * asteroid.outline[0],
                        size * asteroid.outline[1]];
            let c1 = v2d_math.cross(displacement, v2) / 
                                            v2d_math.cross(v1, v2);
            let c2 = v2d_math.cross(v1, displacement) / 
                                            v2d_math.cross(v1, v2);
            if ((c1 >= 0 && c2 >= 0) && c1 + c2 <= 1) return true;

            for (let i = 0; i < 11; ++i) {
                v1 = [size * asteroid.outline[(2 * i)],
                        size * asteroid.outline[(2 * i) + 1]];
                v2 = [size * asteroid.outline[(2 * i) + 2],
                        size * asteroid.outline[(2 * i) + 3]];
                c1 = v2d_math.cross(displacement, v2) / 
                                                v2d_math.cross(v1, v2)
                c2 = v2d_math.cross(v1, displacement) / 
                                                v2d_math.cross(v1, v2)
                
                if ((c1 >= 0 && c2 >= 0) && c1 + c2 <= 1) return true;
            }
            return false;
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
            };
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
            };
            
            window.addEventListener("keydown", that.receiveKeyDowns);
            window.addEventListener("keyup", that.receiveKeyUps);

            that.pauseReceiving = (milleseconds) => {
                window.removeEventListener("keydown", that.receiveKeyDowns);
                window.removeEventListener("keydown", that.receiveKeyUps);

                setTimeout( () => {
                    window.addEventListener("keydown", that.receiveKeyDowns);
                    window.addEventListener("keyup", that.receiveKeyUps);
                }, milleseconds);
            };

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

        // TODO: ufos
        Bullet.drawBullets();

        // Particles
        ParticleEffectsManager.drawEffects();

        // Should be drawn second to last
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

    checkForCollisions() {
        Bullet.detectCollisions();
        Player.detectCollisions();
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

        // Should make the asteroids spawn around the player...
        let centerX = 50;
        let centerY = 50;
        if (flags.isGameActive) {
            centerX = Player.lives[0].xPos;
            centerY = Player.lives[0].yPos;
        }

        for (; numberToSpawn > 0; numberToSpawn--) {
            randSpawnRadius = (45 * Math.random()) + 15;
            randSpawnAngle += (Math.PI * Math.random()) + 0.5;
            randVelocityAngleOffset = 0.75 * Math.PI * 
                                    ((2 * Math.random()) - 1);
            
            Asteroid.spawnedAsteroids.push(
                (new Asteroid(
                    centerX + (randSpawnRadius * Math.cos(randSpawnAngle)),
                    centerY + (randSpawnRadius * Math.sin(randSpawnAngle)),
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

        // start with three more lives in the corner later...
        for (let i = 0; i < 3; ++i) {
            Player.lives.push(new Player());
            Player.lives[i + 1].xPos = 5 + (2 * i);
            Player.lives[i + 1].yPos = 10;
        }
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
        actions.checkForCollisions();
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
    },

    //3. Pause inputs
    function () {
        Player.lives[0].controller.pauseReceiving(8000);
    }
]
