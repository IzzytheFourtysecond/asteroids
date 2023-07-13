"use strict";

/* Define game assets */
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
        The average radius scaling factor will be 0.6. However, 
        the random number is generated such as to make the 
        dodecagon hopefully more spikey.*/
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
            shapeOutline.push((0.5 * randomScaling * Math.cos(angle)) + 0.5);
            //store y-coord...
            shapeOutline.push((0.5 * randomScaling * Math.sin(angle)) + 0.5);
        }

        return shapeOutline;
    }

    return class Asteroid {
        constructor(xPos = 0, yPos = 0, xVel = 0, yVel = 0, size = 2) {
            this.outline = generateOutline();
            this.xPos = xPos;
            this.yPos = yPos;
            this.xVel = xVel;
            this.yVel = yVel;
            this.size = size;
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








drawStartScreen();


// Actual animation...
setInterval(() => {
    //TODO...
}, 34);





/* Tests... */
const test = [
    //0. draw an asteroid
    function() {
        const a = new Asteroid(1000, 1000);

        canvas.ctx.beginPath();

        canvas.ctx.moveTo(
            a.outline[0] * 800 + a.xPos,
            a.outline[1] * 800 + a.yPos);
        
        for (let i = 1; i < 12; i++) {
            canvas.ctx.lineTo(
                (a.outline[(2*i)] * 800) + a.xPos,
                (a.outline[(2*i) + 1] * 800) + a.yPos);
            canvas.ctx.stroke();
        }

        canvas.ctx.closePath();
        
        canvas.ctx.lineWidth = 6;
        canvas.ctx.strokeStyle = "white";
        canvas.ctx.stroke();
    }


]
