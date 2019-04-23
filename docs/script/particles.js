"use strict";

/**
 * Static methods for accessing, configuring and building shaders related
 * to the Particle class.
 */
const ParticlesShaders = (function() {
  /* Private attributes */
  const encodingRawStr =
      `const float MAX_SPEED = ___MAX_SPEED___;
      const vec2 WORLD_SIZE = ___WORLD_SIZE___;
      
      const float POS_BANDWIDTH = ___POS_BANDWIDTH___;//max(WORLD_SIZE.x,WORLD_SIZE.y) + 64.0;
      const float SPEED_BANDWIDTH = 2.0 * MAX_SPEED;
          
      /* Decodes a float value (16 bits in [0,1])
       * from a 2D value (2x8bits in [0,1]x[0,1]) */
      float decode(vec2 v)
      {
          v = clamp(v, vec2(0), vec2(1));
          return 255.0 * (v.x * 256.0 + v.y) / 65535.0;
      }
      
      /* Encodes a float value (16 bits in [0,1])
       * into a 2D value (2x8bits in [0,1]x[0,1]) */
      vec2 encode(float x)
      {
          x = clamp(x, 0.0, 1.0) * (255.0 + 255.0/256.0);
          return vec2(floor(x), floor(fract(x) * 256.0)) / 255.0;
      }
      
      vec2 decodeTexel(vec4 texel, float bandwidth)
      {
          vec2 normalizedValue = vec2(decode(texel.rg), decode(texel.ba));
          return bandwidth * (normalizedValue - 0.5);
      }
      
      vec4 encodeTexel(vec2 value, float bandwidth)
      {
          value = (value / bandwidth) + 0.5;
          return vec4(encode(value.x), encode(value.y));
      }
      
      vec2 decodePosition(vec4 texel) {
          return decodeTexel(texel, POS_BANDWIDTH);
      }
      vec4 encodePosition(vec2 pos) {
          return encodeTexel(pos, POS_BANDWIDTH);
      }
      
      vec2 decodeVelocity(vec4 texel) {
          return decodeTexel(texel, SPEED_BANDWIDTH);
      }
      vec4 encodeVelocity(vec2 vel) {
          return encodeTexel(vel, SPEED_BANDWIDTH);
      }
      
      vec2 decodeObstacle(vec4 texel)
      {
          return 2.0 * texel.rg - 1.0;
      }
      
      float random(vec2 co)
      {
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }`;
    
  const drawVertRawStr =
      `uniform sampler2D uPosBuffer;
      uniform sampler2D uVelBuffer;
      uniform float uPointSize;
      
      attribute vec2 aSampleCoord;

      varying vec4 color;
      
      ___ENCODING_COMMON___
      
      void main(void)
      {
          vec2 pos = decodePosition(texture2D(uPosBuffer, aSampleCoord));
          vec2 vel = decodeVelocity(texture2D(uVelBuffer, aSampleCoord));
          pos *= 2.0 / WORLD_SIZE;
          
          const vec4 slowColor = vec4(0.75,1,1,1);
          const vec4 fastColor = vec4(0, 0.2, 0.8, 1);
          float relativeSpeed = length(vel) / MAX_SPEED;
          float t = smoothstep(0.0, 1.0, relativeSpeed);

          color = mix(slowColor, fastColor, t);
          
          gl_Position = vec4(pos, 0.9*relativeSpeed, 1.0);
          gl_PointSize = uPointSize;
      }`;

  const drawFragStr =
      `precision mediump float;

      varying vec4 color;
      
      void main(void) {
        vec2 toCenter = 2.0 * (vec2(0.5) - gl_PointCoord.xy);
        float sqDist = dot(toCenter,toCenter);
        if (sqDist > 1.0)
          discard;
        
        gl_FragColor = color;
      }`;
  
  const updateVertStr =
    `attribute vec2 aCorner; //in {0,1}x{0,1}

    varying vec2 sampleCoords;
    
    void main(void) {
        sampleCoords = aCorner;
        gl_Position = vec4(2.0*aCorner - 1.0, 0.0, 1.0);
    }`;

  const updatePosFragRawStr =
    `precision mediump float;

    uniform sampler2D uPrevPosBuffer;
    uniform sampler2D uVelBuffer;
    uniform sampler2D uObstaclesBuffer;
    
    uniform float uDt; //in seconds
    
    varying vec2 sampleCoords;
    
    ___ENCODING_COMMON___
        
    void main(void)
    {
      vec2 pos = decodePosition(texture2D(uPrevPosBuffer, sampleCoords));
      vec2 vel = decodeVelocity(texture2D(uVelBuffer, sampleCoords));
      
      vec2 nextPos = pos + uDt * vel;
      
      /* Particles don't stay inside an obstacle */
      vec2 obstacleNormal = decodeObstacle(texture2D(uObstaclesBuffer, nextPos / WORLD_SIZE + 0.5));
      nextPos += uDt * obstacleNormal;

      if (pos.y < -0.5 * WORLD_SIZE.y) {
          nextPos.x = (random(pos + vel) - 0.5) * WORLD_SIZE.x;
          nextPos.y += WORLD_SIZE.y + 0.5 * random(pos) * (POS_BANDWIDTH - WORLD_SIZE.y);
      }
      /*if (nextPos.x < -0.5 * POS_BANDWIDTH)
        nextPos.x += POS_BANDWIDTH;
      else if (nextPos.x > 0.5 * POS_BANDWIDTH)
        nextPos.x -= POS_BANDWIDTH;*/

      gl_FragColor = encodePosition(nextPos);
    }`

  const updateVelFragRawStr =
    `precision mediump float;

    uniform sampler2D uPosBuffer;
    uniform sampler2D uPrevVelBuffer;
    uniform sampler2D uObstaclesBuffer;
    
    uniform float uDt; //in seconds
    uniform vec2 uAcceleration;
    
    varying vec2 sampleCoords;
    
    ___ENCODING_COMMON___
    
    void main(void)
    {
      vec2 pos = decodePosition(texture2D(uPosBuffer, sampleCoords));
      vec2 vel = decodeVelocity(texture2D(uPrevVelBuffer, sampleCoords));
      vec2 acc = uAcceleration;
      
      vec2 nextVel = vel + uDt * acc;
      
      if (pos.y < -0.5 * WORLD_SIZE.y) {
          nextVel.x = 0.1 * MAX_SPEED * (2.0*random(100.0*pos) - 1.0);
          nextVel.y = random(pos + vel);
      }
      
      vec2 obstacleNormal = decodeObstacle(texture2D(uObstaclesBuffer, pos / WORLD_SIZE + 0.5));
      if (dot(obstacleNormal, obstacleNormal) > 0.1) {
          if (dot(nextVel, obstacleNormal) < 0.0) {
              nextVel = reflect(nextVel, normalize(obstacleNormal));
              nextVel *= min(1.0, 0.1*MAX_SPEED/length(nextVel));
          }
      }
      
      nextVel *= min(1.0, MAX_SPEED / length(nextVel));
      gl_FragColor = encodeVelocity(nextVel);
    }`;

  let encodingStr, drawVertStr, updatePosFragStr, updateVelFragStr;

  /* Public static methods */
  let visible = {
    setWorldSize: function(width, height) {
      const posBandwidth = 1.2 * Math.max(width, height);
      const maxSpeed = 0.5 * Math.min(width, height);
      const worldSizeStr = "vec2(" + width + "," + height + ")";
      
      encodingStr = encodingRawStr.replace(/___MAX_SPEED___/g, maxSpeed.toFixed(1));
      encodingStr = encodingStr.replace(/___WORLD_SIZE___/g, worldSizeStr);
      encodingStr = encodingStr.replace(/___POS_BANDWIDTH___/g, posBandwidth.toFixed(1));
      
      drawVertStr = drawVertRawStr.replace(/___ENCODING_COMMON___/g, encodingStr);
      updatePosFragStr = updatePosFragRawStr.replace(/___ENCODING_COMMON___/g, encodingStr);
      updateVelFragStr = updateVelFragRawStr.replace(/___ENCODING_COMMON___/g, encodingStr);
    },
        
    getDrawShader: function(gl) {
      return Shader.fromString(gl, drawVertStr, drawFragStr);
    },
    
    getUpdatePosShader: function(gl) {
      return Shader.fromString(gl, updateVertStr, updatePosFragStr);
    },
    
    getUpdateVelShader: function(gl) {
      return Shader.fromString(gl, updateVertStr, updateVelFragStr);
    },
  };
  
  return Object.freeze(visible);
})();


/**
 * Class for creating, updating and displaying a collection of particles.
 */
class Particles {
  /**
   * Constructor. The particles will be stored in texturees of size width*height,
   * so there will be width*height particles. Non-power-of-two values may not work
   * on certain platforms.
   * @param {WebGLRenderingContext} gl
   * @param {number} width
   * @param {number} height
   */
  constructor(gl, width, height) {
    this._worldSize = { width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight };
    
    ParticlesShaders.setWorldSize(this._worldSize.width, this._worldSize.height);
    this._drawShader = ParticlesShaders.getDrawShader(gl);
    this._updatePosShader = ParticlesShaders.getUpdatePosShader(gl);
    this._updateVelShader = ParticlesShaders.getUpdateVelShader(gl);
    
    const cornersVBO = VBO.createQuad(gl, 0, 0, 1, 1);
    this._updatePosShader.a["aCorner"].VBO = cornersVBO;
    this._updateVelShader.a["aCorner"].VBO = cornersVBO;
    
    this._updateFBO = FBO.create(gl, width, height);
    
    const sampleCoordsVBO = Particles.initSampleCoordVBO(gl, width, height);
    this._drawShader.a["aSampleCoord"].VBO = sampleCoordsVBO;
    
    this._positionTextures = Particles.createRandomTextures(gl, width, height);
    this._velTextures = Particles.createRandomTextures(gl, width, height);
    this._currIndex = 0;
    this.acceleration = [0, -100];
    this.pointSize = 2;
    this.speed = 1;
  }

  /**
   * Reinitializes the particles with random positions and velocities.
   * @param {WebGLRenderingContext} gl
   * @param {number} width
   * @param {number} height
   */
  reset(gl, width, height) {
    this._updateFBO.width = width;
    this._updateFBO.height = height;
    this._drawShader.a["aSampleCoord"].VBO = Particles.initSampleCoordVBO(gl, width, height);
    this._positionTextures = Particles.createRandomTextures(gl, width, height);
    this._velTextures = Particles.createRandomTextures(gl, width, height);
  }
  
  set acceleration(vector) {
    this._updateVelShader.u["uAcceleration"].value = vector;
  }
  
  set pointSize(size) {
    this._drawShader.u["uPointSize"].value = size;
  }
  
  get nbParticles() {
    return this._updateFBO.width * this._updateFBO.height;
  }
  
  get currPosTex() {
    return this._positionTextures[this._currIndex];
  }
    
  get currVelTex() {
    return this._velTextures[this._currIndex];
  }
  
  get nextPosTex() {
    return this._positionTextures[(this._currIndex + 1) % 2];
  }
  
  get nextVelTex() {
    return this._velTextures[(this._currIndex + 1) % 2];
  }
  
  switchTextures() {
    this._currIndex = (this._currIndex + 1) % 2;
  }
  
/**
  * Reads currPos, currVel and the obstacle map to update nextVel.
 * @param {WebGLRenderingContext} gl
 * @param {ObstacleMap} obstacleMap
 * @param {number} dt the time step in seconds.
 */
  updateVel(gl, obstacleMap, dt) {   
    this._updateVelShader.u["uPosBuffer"].value = this.currPosTex;
    this._updateVelShader.u["uPrevVelBuffer"].value = this.currVelTex;
    this._updateVelShader.u["uObstaclesBuffer"].value = obstacleMap.texture;
    this._updateVelShader.u["uDt"].value = this.speed * dt;
    
    this._updateFBO.bind(gl, this.nextVelTex, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this._updateVelShader);
    this._updateVelShader.bindUniformsAndAttributes(gl);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
/**
 * Reads currPos, nextVel and the obstacle map to update nextPos.
 * @param {WebGLRenderingContext} gl
 * @param {ObstacleMap} obstacleMap
 * @param {number} dt the time step in seconds
 */
  updatePosition(gl, obstacleMap, dt) {
    this._updatePosShader.u["uPrevPosBuffer"].value = this.currPosTex;
    this._updatePosShader.u["uVelBuffer"].value = this.nextVelTex;
    this._updatePosShader.u["uObstaclesBuffer"].value = obstacleMap.texture;
    this._updatePosShader.u["uDt"].value = this.speed * dt;

    this._updateFBO.bind(gl, this.nextPosTex, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this._updatePosShader);
    this._updatePosShader.bindUniformsAndAttributes(gl);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Updates the particles velocities and positions.
   * @param {WebGLRenderingContext} gl
   * @param {ObstacleMap} obstacleMap
   * @param {nuumber} dt the time step in seconds
   */
  update(gl, obstacleMap, dt) {
    this.updateVel(gl, obstacleMap, dt);
    this.updatePosition(gl, obstacleMap, dt);
    
    this.switchTextures();
  }
  
  draw(gl) {
    this._drawShader.u["uPosBuffer"].value = this.currPosTex;
    this._drawShader.u["uVelBuffer"].value = this.currVelTex;
    
    gl.useProgram(this._drawShader);
    this._drawShader.bindUniformsAndAttributes(gl);
    gl.enable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, this.nbParticles);
    gl.disable(gl.DEPTH_TEST);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Creates the VBO containing the position where to sample the buffers
   * for each particle.
   * @param {WebGLRenderingContext} gl
   * @param {number} width
   * @param {number} height
   * @returns {Object} a VBO object created by the VBO module
   */
  static initSampleCoordVBO(gl, width, height) {
    let vert = [];
    for (let iX = 0 ; iX < width ; ++iX) {
      for (let iY = 0 ; iY < height ; ++iY) {
        vert.push(iX / (width-1));
        vert.push(iY / (height-1));
      }
    }
    
    return VBO.createFromArray(gl, new Float32Array(vert), 2, gl.FLOAT);
  }
  
/**
 * Initializes randomly filled textures.
 * @param {WebGLRenderingContext} gl
 * @param {number} width
 * @param {number} height
  * @returns {Object} array of 2 random textures of size width*height
 */
  static createRandomTextures(gl, width, height) {
    let texelData = [];
    for (let i = 0 ; i < 4 * width * height ; ++i) {
      texelData.push(256 * Math.random());
    }
    
    const textures = [gl.createTexture(), gl.createTexture()];
    for (let texture of textures) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(texelData));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    return textures;
  }
}