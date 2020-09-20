"use strict";

/**
 * Initializes a WebGL 1 context.
 * @param {HTMLCanvasElement} canvas
 * @param {object} flags
 */
function initGL(canvas, flags) {
  function setError(message) {
    Page.Demopage.setErrorMessage("webgl-support", message);
  }

  let gl = canvas.getContext("webgl", flags);
  if (!gl) {
    gl = canvas.getContext("experimental-webgl", flags);
    if (!gl) {
      setError("Your browser or device does not seem to support WebGL.");
      return null;
    }
    setError("Your browser or device only supports experimental WebGL.\n" +
      "The simulation may not run as expected.");
  }
    
  canvas.style.cursor = "none";
  gl.canvas.width = canvas.clientWidth;
  gl.canvas.height = canvas.clientHeight;
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
    
  return gl;
}

function main() {
  const canvas = Page.Canvas.getCanvas();
  const gl = initGL(canvas, {alpha:false});
  if (!gl)
    return;
    
  const particles = new Particles(gl, 16, 16);
  const obstacles = new ObstacleMap(gl);
  const fluidifier = new Fluidify(gl);
  
  /* The default rendering mode is blurred. */
  let fluidMode = true;
  Parameters.setFluidMode = (bool) => {
    fluidMode = bool;
    Parameters.showFluidSection(bool);
  };
  Parameters.setFluidMode(true);

  /* Bind the HTML inputs to the simulation */
  Parameters.bind(gl, canvas, particles, obstacles, fluidifier);
  
  /* Update the FPS indicator every second. */
  let instantFPS;
  const updateFpsText = function() {
    Page.Canvas.setIndicatorText("fps", instantFPS.toFixed(0));
  };
  setInterval(updateFpsText, 1000);
  
  let lastUpdate = 0;
  function mainLoop(time) {
    time *= 0.001; //dt is now in seconds
    let dt = time - lastUpdate;
    instantFPS = 1 / dt;
    lastUpdate = time;
    
    /* If the javascript was paused (tab lost focus), the dt may be too big.
     * In that case we adjust it so the simulation resumes correctly. */
    dt = Math.min(dt, 1/10);
    
    /* Updating */
    particles.update(gl, obstacles, dt);
    
    /* Drawing */
    if (fluidMode) {
      fluidifier.bindFBO(gl);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      particles.draw(gl);
      
      fluidifier.process(gl);
      
      FBO.bindDefault(gl);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      fluidifier.draw(gl);
      obstacles.draw(gl);
    } else {
      FBO.bindDefault(gl);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      particles.draw(gl);
      obstacles.draw(gl);
    }
    
    requestAnimationFrame(mainLoop);
  }
  
  requestAnimationFrame(mainLoop);
}

main();