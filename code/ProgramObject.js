// ProgramObject.js (c) 2012 matsuda and kanda
// Vertex shader for single color drawing
var SOLID_VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +    // Model matrix
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform vec3 u_LightColor;\n' +   // Diffuse light color
  'uniform vec3 u_LightPosition;\n' + // Diffuse light direction (in the world coordinate, normalized)
  'uniform vec3 u_AmbientLight;\n' +   // Color of an ambient light
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  vec4 color = vec4(1.0, 1.0, 1.0, 1.0);\n' + // Sphere color
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
     // Calculate a normal to be fit with a model matrix, and make it 1.0 in length
  '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
     // Calculate world coordinate of vertex
  '  vec4 vertexPosition = u_ModelMatrix * a_Position;\n' +
     // Calculate the light direction and make it 1.0 in length
  '  vec3 lightDirection = normalize(u_LightPosition - vec3(vertexPosition));\n' +
     // The dot product of the light direction and the normal
  '  float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
     // Calculate the color due to diffuse reflection
  '  vec3 diffuse = u_LightColor * color.rgb * nDotL;\n' +
     // Calculate the color due to ambient reflection
  '  vec3 ambient = u_AmbientLight * color.rgb;\n' +
     // Add the surface colors due to diffuse reflection and ambient reflection
  '  v_Color = vec4(diffuse + ambient, color.a);\n' + 
  '}\n';


// Fragment shader for single color drawing
var SOLID_FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';


// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
   //  'attribute vec4 a_Color;\n' + // Defined constant in main()
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +    // Model matrix
  'uniform mat4 u_NormalMatrix;\n' +   // Transformation matrix of the normal
  'varying vec4 v_Color;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_Position;\n' +
  'void main() {\n' +
  '  vec4 color = vec4(1.0, 1.0, 1.0, 1.0);\n' + // Sphere color
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
     // Calculate the vertex position in the world coordinate
  '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  v_Color = color;\n' + 
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'uniform vec3 u_LightColor;\n' +     // Light color
  'uniform vec3 u_LightPosition;\n' +  // Position of the light source
  'uniform vec3 u_AmbientLight;\n' +   // Ambient light color
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_Position;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
     // Normalize the normal because it is interpolated and not 1.0 in length any more
  '  vec3 normal = normalize(v_Normal);\n' +
     // Calculate the light direction and make it 1.0 in length
  '  vec3 lightDirection = normalize(u_LightPosition - v_Position);\n' +
     // The dot product of the light direction and the normal
  '  float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
     // Calculate the final color from diffuse reflection and ambient reflection
  '  vec3 diffuse = u_LightColor * v_Color.rgb * nDotL;\n' +
  '  vec3 ambient = u_AmbientLight * v_Color.rgb;\n' +
  '  gl_FragColor = vec4(diffuse + ambient, v_Color.a);\n' +
  '}\n';



// Calculate the view projection matrix
var viewProjMatrix = new Matrix4();
 
// Coordinate transformation matrix
var g_modelMatrix = new Matrix4();
var g_mvpMatrix = new Matrix4();
var g_normalMatrix = new Matrix4();

// The increments of rotation angle (degrees)
var ANGLE_STEP = 45;  

var animationToggle = false;
var cameraToggle = false; // False = Perspective    True = Orthographic
var currentAngle = 90.0; // Current rotation angle (degrees)
var zoomValue = 45.0;
var orthoScale = 0.0;




function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  var cylinderProgram = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  
  
  if (!cylinderProgram) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get storage locations of attribute and uniform variables in program object for single color drawing
  cylinderProgram.a_Position = gl.getAttribLocation(cylinderProgram, 'a_Position');
  cylinderProgram.a_Normal = gl.getAttribLocation(cylinderProgram, 'a_Normal');
  cylinderProgram.u_MvpMatrix = gl.getUniformLocation(cylinderProgram, 'u_MvpMatrix');
  cylinderProgram.u_ModelMatrix = gl.getUniformLocation(cylinderProgram, 'u_ModelMatrix');
  cylinderProgram.u_NormalMatrix = gl.getUniformLocation(cylinderProgram, 'u_NormalMatrix');
  cylinderProgram.u_LightColor = gl.getUniformLocation(cylinderProgram, 'u_LightColor');
  cylinderProgram.u_LightPosition = gl.getUniformLocation(cylinderProgram, 'u_LightPosition');
  cylinderProgram.u_AmbientLight = gl.getUniformLocation(cylinderProgram, 'u_AmbientLight');

  if (cylinderProgram.a_Position < 0 || cylinderProgram.a_Normal < 0 || 
      !cylinderProgram.u_MvpMatrix || !cylinderProgram.u_NormalMatrix || !cylinderProgram.u_LightPosition || !cylinderProgram.u_AmbientLight || !cylinderProgram.u_LightColor) { 
    console.log('Failed to get the storage location of attribute or uniform variable'); 
    return;
  }

  // Set the vertex information
  var cube = initVertexBuffers(gl);
  if (!cube) {
    console.log('Failed to set the vertex information');
    return;
  }
  // Set the clear color and enable the depth test
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Calculate the view projection matrix
  viewProjMatrix.setPerspective(zoomValue, canvas.width/canvas.height, 1.0, 100.0);
  viewProjMatrix.lookAt(0.0, 0.0, 5.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
  
  gl.useProgram(cylinderProgram);
  
  // Set the light color (white)
  gl.uniform3f(cylinderProgram.u_LightColor,  0.8, 0.8, 0.8);
  var lightDirection = new Vector3([ 5.0, 5.0, 5.0]);
  lightDirection.normalize();     // Normalize
  gl.uniform3fv(cylinderProgram.u_LightPosition, lightDirection.elements);
  // Set the ambient light
  gl.uniform3f(cylinderProgram.u_AmbientLight, 0.2, 0.0, 0.5);

  document.getElementById("cameraSwitch").addEventListener("click", function() {
    cameraToggle = cameraToggle ? false : true;
    
  });

  document.getElementById("animationSwitch").addEventListener("click", async function() {
    animationToggle = animationToggle ? false : true;
    console.log(animationToggle);
    while (animationToggle) {
      await sleep(75);
      if (!animationToggle) {
        viewProjMatrix.setPerspective(zoomValue, canvas.width/canvas.height, 1.0, 100.0);
        viewProjMatrix.lookAt(0.0, 0.0, 5.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
        break;
      }
      viewProjMatrix.lookAt(0.0, 0.0, 0.0, -1.0, 0.0, -1.0, 0.0, 1.0, 0.0);
      initCylinders(gl, cylinderProgram, cube, -2.0, currentAngle, viewProjMatrix);
    
      if (!animationToggle) {
        if (!cameraToggle) {
        viewProjMatrix.setPerspective(zoomValue, canvas.width/canvas.height, 1.0, 100.0);
        }
        else {
          viewProjMatrix.setOrtho(-orthoScale, orthoScale, -orthoScale, orthoScale, 1.0, 100.0);
        }
        viewProjMatrix.lookAt(0.0, 0.0, 5.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
        break;
      }
    }


  });

  document.getElementById("moveX").addEventListener("input", function() {
    zoomValue = 90-this.value;
    orthoScale = this.value/15;
    if (!cameraToggle) {
      viewProjMatrix.setPerspective(zoomValue, canvas.width/canvas.height, 1.0, 100.0);
      viewProjMatrix.lookAt(0.0, 0.0, 5.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    }
    else {
       viewProjMatrix.setOrtho(-orthoScale, orthoScale, -orthoScale, orthoScale, 1.0, 100.0);
       viewProjMatrix.lookAt(0.0, 0.0, 5.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    }
    
    
    console.log(this.value);
    initCylinders(gl, cylinderProgram, cube, -2.0, currentAngle, viewProjMatrix);
  });

  // Start drawing
  var tick = async function() {
    currentAngle = animate(currentAngle);  // Update current rotation angle
    
    //console.log(Math.cos(currentAngle*Math.PI/180));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers
    // Draw a cube in single color
    initCylinders(gl, cylinderProgram, cube, -2.0, currentAngle, viewProjMatrix);
    console.log(viewProjMatrix.elements);
  

    window.requestAnimationFrame(tick, canvas);
  };
  tick();
}


function initCylinders(gl, program, o, x, angle, viewProjMatrix) {
  gl.useProgram(program);   // Tell that this program object is used

  // Assign the buffer objects and enable the assignment
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer); // Vertex coordinates
  initAttributeVariable(gl, program.a_Normal, o.normalBuffer);   // Normal
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);  // Bind indices
  
  // Calculate a model matrix
  
  g_modelMatrix.setTranslate(-0.5, 0.0, 0.0);
  g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);
  g_modelMatrix.scale(0.6, 0.6, 0.6);
  
  g_mvpMatrix.set(viewProjMatrix).multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

  drawCylinders(gl, program, o, x, angle, viewProjMatrix);   // Draw

  
  // Calculate a model matrix
  g_modelMatrix.setTranslate(0.5, 0.0, 0.0);
  g_modelMatrix.rotate(-35.0, 1.0, 0.0, 0.0);
  g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);
  g_modelMatrix.scale(0.6, 0.6, 0.6);
  
  g_mvpMatrix.set(viewProjMatrix).multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

 drawCylinders(gl, program, o, x, angle, viewProjMatrix);   // Draw
}

// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}


function drawCylinders(gl, program, o, x, angle, viewProjMatrix) {
  // Calculate transformation matrix for normals and pass it to u_NormalMatrix
  g_normalMatrix.setInverseOf(g_modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

  // Calculate model view projection matrix and pass it to u_MvpMatrix
  g_mvpMatrix.set(viewProjMatrix);
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

  gl.drawElements(gl.TRIANGLES, o.numIndices, o.indexBuffer.type, 0);   // Draw
}

function initArrayBuffer(gl, data, num, type) {
  var buffer = gl.createBuffer();   // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Keep the information necessary to assign to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initElementArrayBuffer(gl, data, type) {
  var buffer = gl.createBuffer();　  // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

  buffer.type = type;

  return buffer;
}

var last = Date.now(); // Last time that this function was called
function animate(angle) {
  var now = Date.now();   // Calculate the elapsed time
  var elapsed = now - last;
  last = now;
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle - (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle % 360;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// ---------------------------------------------------------------
//                           Sphere 
// ---------------------------------------------------------------


function initVertexBuffers(gl) { // Create a sphere
  var CYLINDER_DIV = 15;
  var CYLINDER_HEIGHT = 1.0;
  var CYLINDER_RADIUS = 0.5;

  var positions = [];
  var normals = [];
  var indices = [];

  // Generate side vertices and normals
  for (var j = 0; j <= CYLINDER_DIV; j++) {
    var aj = j * 2 * Math.PI / CYLINDER_DIV;
    var sj = Math.sin(aj);
    var cj = Math.cos(aj);
    for (var i = 0; i <= CYLINDER_DIV; i++) {
      var ai = i * 2 * Math.PI / CYLINDER_DIV;
      var si = Math.sin(ai);
      var ci = Math.cos(ai);

      positions.push(si * CYLINDER_RADIUS);  // X
      positions.push(-CYLINDER_HEIGHT / 2 + j * CYLINDER_HEIGHT / CYLINDER_DIV);  // Y
      positions.push(ci * CYLINDER_RADIUS);  // Z

      normals.push(si);  // X
      normals.push(0);   // Y
      normals.push(ci);  // Z
    }
  }

  // Generate indices for the sides
  for (var j = 0; j < CYLINDER_DIV; j++) {
    for (var i = 0; i < CYLINDER_DIV; i++) {
      var p1 = j * (CYLINDER_DIV + 1) + i;
      var p2 = p1 + (CYLINDER_DIV + 1);

      indices.push(p1);
      indices.push(p2);
      indices.push(p1 + 1);

      indices.push(p1 + 1);
      indices.push(p2);
      indices.push(p2 + 1);
    }
  }

  // Generate vertices and indices for top and bottom circles
  var centerTop = [0, CYLINDER_HEIGHT / 2, 0];
  var centerBottom = [0, -CYLINDER_HEIGHT / 2, 0];
  var topIndices = [];
  var bottomIndices = [];

  // Top circle
  var topCenterIndex = positions.length / 3;
  positions.push(...centerTop);
  normals.push(0, 1, 0);
  for (var i = 0; i < CYLINDER_DIV; i++) {
    var angle = i * 2 * Math.PI / CYLINDER_DIV;
    var x = Math.cos(angle) * CYLINDER_RADIUS;
    var z = Math.sin(angle) * CYLINDER_RADIUS;
    positions.push(x, CYLINDER_HEIGHT / 2, z);
    normals.push(0, 1, 0);
    topIndices.push(topCenterIndex, topCenterIndex + i + 1, topCenterIndex + (i + 1) % CYLINDER_DIV + 1);
  }

  // Bottom circle
  var bottomCenterIndex = positions.length / 3;
  positions.push(...centerBottom);
  normals.push(0, -1, 0);
  for (var i = 0; i < CYLINDER_DIV; i++) {
    var angle = i * 2 * Math.PI / CYLINDER_DIV;
    var x = Math.cos(angle) * CYLINDER_RADIUS;
    var z = Math.sin(angle) * CYLINDER_RADIUS;
    positions.push(x, -CYLINDER_HEIGHT / 2, z);
    normals.push(0, -1, 0);
    bottomIndices.push(bottomCenterIndex, bottomCenterIndex + (i + 1) % CYLINDER_DIV + 1, bottomCenterIndex + i + 1);
  }

  // Connect the circles
  indices.push(...topIndices);
  indices.push(...bottomIndices);


  var vertices = new Float32Array(positions);
  var normals = new Float32Array(normals);
  var indices1 = new Uint8Array(indices);


  var o = new Object(); // Utilize Object to to return multiple buffer objects together

  // Write vertex information to buffer object
  o.vertexBuffer = initArrayBuffer(gl, vertices, 3, gl.FLOAT);
  o.normalBuffer = initArrayBuffer(gl, normals, 3, gl.FLOAT);
  o.indexBuffer = initElementArrayBuffer(gl, indices1, gl.UNSIGNED_BYTE);
  if (!o.vertexBuffer || !o.normalBuffer || !o.indexBuffer) return null; 

  o.numIndices = indices.length;

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}

