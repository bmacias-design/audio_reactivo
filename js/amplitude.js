let mic;
function setup() {
    createCanvas(400, 400);
    mic = new p5.AudioIn();
    mic.start();    
}

function draw() {
    background(220);
    let vol = mic.getLevel();
    fill(255, 0, 0);
    ellipse(width/2, height/2, vol*200, vol*200);
}   