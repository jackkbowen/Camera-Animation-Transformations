
var canvas = document.getElementById('webgl-canvas');
var gl = canvas.getContext('webgl');

// Define vertices, edges, and normals for the cylinder
var vertices = [];
var edges = [];
var normals = [];

var radius = 0.5;
var height = 1.0;
var segments = 50;

for (var i = 0; i < segments; i++) {
    var theta = (i / segments) * 2 * Math.PI;

    var x = radius * Math.cos(theta);
    var y = radius * Math.sin(theta);

    vertices.push(x, y, -height / 2);
    vertices.push(x, y, height / 2);

    normals.push(x, y, 0);
    normals.push(x, y, 0);

    if (i < segments - 1) {
        edges.push(i * 2, i * 2 + 1);
        edges.push(i * 2 + 1, (i + 1) * 2 + 1);
        edges.push((i + 1) * 2 + 1, (i + 1) * 2);
        edges.push((i + 1) * 2, i * 2);
    } else {
        edges.push(i * 2, i * 2 + 1);
        edges.push(i * 2 + 1, 0);
        edges.push(0, 1);
        edges.push(1, i * 2);
    }
}

// Create and bind buffer for vertices
var vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

// Create and bind buffer for normals
var normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

// Create and bind buffer for edges
var edgeBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(edges), gl.STATIC_DRAW);

// Draw function
function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
    gl.vertexAttribPointer(
        positionAttribLocation,
        3, // number of elements per attribute
        gl.FLOAT, // type of elements
        false, // normalise
        0, // size of an individual vertex
        0 // offset from the beginning of a single vertex to this attribute
    );
    gl.enableVertexAttribArray(positionAttribLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    var normalAttribLocation = gl.getAttribLocation(program, 'vertNormal');
    gl.vertexAttribPointer(
        normalAttribLocation,
        3, // number of elements per attribute
        gl.FLOAT, // type of elements
        false, // normalise
        0, // size of an individual vertex
        0 // offset from the beginning of a single vertex to this attribute
    );
    gl.enableVertexAttribArray(normalAttribLocation);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeBuffer);
    gl.drawElements(gl.LINES, edges.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(draw);
}

// Shader program
var vertexShaderText = `
    attribute vec3 vertPosition;
    attribute vec3 vertNormal;
    varying vec3 fragNormal;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(vertPosition, 1.0);
        fragNormal = (modelViewMatrix * vec4(vertNormal, 0.0)).xyz;
    }
`;

var fragmentShaderText = `
    precision mediump float;
    varying vec3 fragNormal;

    void main() {
        vec3 normal = normalize(fragNormal);
        gl_FragColor = vec4(normalize(normal).xyz, 1.0);
    }
`;

// Compile shaders
function compileShader(gl, source, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling shader!', gl.getShaderInfoLog(shader));
        return;
    }

    return shader;
}

var vertexShader = compileShader(gl, vertexShaderText, gl.VERTEX_SHADER);
var fragmentShader = compileShader(gl, fragmentShaderText, gl.FRAGMENT_SHADER);

// Create shader program
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('ERROR linking program!', gl.getProgramInfoLog(program));
    return;
}

gl.validateProgram(program);
if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
    console.error('ERROR validating program!', gl.getProgramInfoLog(program));
    return;
}

gl.useProgram(program);

// Set background color
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
gl.enable(gl.DEPTH_TEST);

// Set up projection matrix
var projectionMatrix = new Float32Array([
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, -1.0, -1.0,
    0.0, 0.0, 0.0, 1.0
]);
var projectionMatrixUniformLocation = gl.getUniformLocation(program, 'projectionMatrix');
gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

// Set up model view matrix
var modelViewMatrix = new Float32Array([
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, -2.0, 1.0
]);
var modelViewMatrixUniformLocation = gl.getUniformLocation(program, 'modelViewMatrix');
gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);

draw();

