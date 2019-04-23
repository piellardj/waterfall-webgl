"use strict";

/**
 * Module used for binding HTML inputs with the Javascript objects of
 * the simulation.
 */
var Parameters = (function(){
  /* Private static methods */
  function bindRenderingSection(gl, particles, fluidify) {
    {
      const POINT_SIZE_CONTROL_ID = "point-size-range-id";
      const updatePointSize = (newSize) => { particles.pointSize = newSize; };
      Range.addObserver(POINT_SIZE_CONTROL_ID, updatePointSize);
      updatePointSize(Range.getValue(POINT_SIZE_CONTROL_ID));
    }
    {
      const BLUR_CONTROL_ID = "blur-range-id";
      const updateBlur = (radius) => { fluidify.setKernelSize(gl, radius); };
      Range.addObserver(BLUR_CONTROL_ID, updateBlur);
      updateBlur(Range.getValue(BLUR_CONTROL_ID));
    }
    {
      const THRESHOLD_CONTROL_ID = "threshold-range-id";
      const updateThreshold = (newValue) => { fluidify.threshold = newValue; };
      Range.addObserver(THRESHOLD_CONTROL_ID, updateThreshold);
      updateThreshold(Range.getValue(THRESHOLD_CONTROL_ID));
    }
    {
      const NORMALS_CONTROL_ID = "water-normals-checkbox-id";
      const setWaterNormals = (show) => { fluidify.showNormals = show; };
      Checkbox.addObserver(NORMALS_CONTROL_ID, setWaterNormals);
      setWaterNormals(Checkbox.isChecked(NORMALS_CONTROL_ID));
    }
    {
      const SPECULAR_CONTROL_ID = "specular-checkbox-id";
      const updateSpecular = (enable) => { fluidify.specular = enable; };
      Checkbox.addObserver(SPECULAR_CONTROL_ID, updateSpecular);
      updateSpecular(Checkbox.isChecked(SPECULAR_CONTROL_ID));
    }
  }

  function bindParticlesSection(gl, particles) {
    {
      const sizes = [{width: 16, height: 16},
                      {width: 32, height: 32},
                      {width: 64, height: 64},
                      {width: 128, height: 128},
                      {width: 256, height: 256},
                      {width: 512, height: 512},
                      {width: 512, height: 1024},
                      {width: 1024, height: 1024},
                      {width: 1024, height: 2048},
                      {width: 2048, height: 2048},];
    
      const AMOUNT_CONTROL_ID = "quantity-range-id";
      const updateAmount = function(sliderValue) {
        const size = sizes[sliderValue];
        particles.reset(gl, size.width, size.height);
        
        Canvas.setIndicatorText("number-of-particles", particles.nbParticles);
      }
      Range.addObserver(AMOUNT_CONTROL_ID, updateAmount);
      updateAmount(Range.getValue(AMOUNT_CONTROL_ID));
    }

    {
      const GRAVITY_CONTROL_ID = "gravity-range-id";
      const updateGravity = (newGravity) => { particles.acceleration =[0, -newGravity]; };
      Range.addObserver(GRAVITY_CONTROL_ID, updateGravity);
      updateGravity(Range.getValue(GRAVITY_CONTROL_ID));
    }
    {
      const SPEED_CONTROL_ID = "speed-range-id";
      const updateSpeed = (newSpeed) => { particles.speed = newSpeed; };
      Range.addObserver(SPEED_CONTROL_ID, updateSpeed);
      updateSpeed(Range.getValue(SPEED_CONTROL_ID));
    }
  }

  function bindObstaclesSection(gl, canvas, obstacles, fluidify) {
    const RESET_CONTROL_ID = "clear-button-id";
    const clear = () => { obstacles.reset(gl), false; };
    Button.addObserver(RESET_CONTROL_ID, clear);

    {
      const BRUSH_SIZE_CONTROL_ID = "radius-range-id";
      const updateBrushSize = function(sliderValue) {
        const value = sliderValue;
        obstacles.brushSize = [value / canvas.clientWidth,
          value / canvas.clientHeight];
      }
      Range.addObserver(BRUSH_SIZE_CONTROL_ID, updateBrushSize);
      updateBrushSize(Range.getValue(BRUSH_SIZE_CONTROL_ID));
    }

    {
      const NORMALS_CONTROL_ID = "obstacles-normals-checkbox-id";
      const setWaterNormals = (show) => { obstacles.displayNormals  = show; };
      Checkbox.addObserver(NORMALS_CONTROL_ID, setWaterNormals);
      setWaterNormals(Checkbox.isChecked(NORMALS_CONTROL_ID));
    }
  }

  function bindMouse(gl, obstacles) {
    Canvas.Observers.mouseMove.push(function (relativeX, relativeY) {
      obstacles.setMobileObstacle(gl, relativeX, relativeY);
      if (Canvas.isMouseDown()) {
        obstacles.addStaticObstacle(gl, relativeX, relativeY);
      }
    });

    Canvas.Observers.mouseDown.push(function() {
      const relativePos = Canvas.getMousePosition();
      obstacles.addStaticObstacle(gl, relativePos[0], relativePos[1]);
    });
  }

  /* Public static methods */
  let visible = {
    setFluidMode: function(bool) {},
    
    showFluidSection: function(show) {
      Controls.setVisibility("blur-range-id", show);
      Controls.setVisibility("threshold-range-id", show);
      Controls.setVisibility("specular-checkbox-id", show);
    },

    bind: function(gl, canvas, particles, obstacles, fluidify) {
      bindRenderingSection(gl, particles, fluidify);
      bindParticlesSection(gl, particles);
      bindObstaclesSection(gl, canvas, obstacles, fluidify);
      bindMouse(gl, obstacles);
      
      const MODE_CONTROL_ID = "mode";
      const setMode = (fluidControlValues) => {
        const fluid = (fluidControlValues[0] === "fluid");

        this.showFluidSection(fluid);
        this.setFluidMode(fluid);
      };
      Tabs.addObserver(MODE_CONTROL_ID, setMode);
      setMode(Tabs.getValues(MODE_CONTROL_ID));
    },
  };
  
  Object.defineProperty(visible, "bind", {writable: false});
  Object.preventExtensions(visible);
  Object.seal(visible);
  
  return visible;
  
})();