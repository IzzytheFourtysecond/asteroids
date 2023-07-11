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

}, 34);
