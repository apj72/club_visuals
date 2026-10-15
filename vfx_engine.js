/* GPU post-processing for a complete Club Visuals frame. */
(() => {
  const vertex = `#version 300 es
    void main() {
      vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;
  const effect = `#version 300 es
    precision highp float;
    uniform sampler2D sourceFrame, previousFrame, shapeMask;
    uniform vec2 resolution, point, shapeCenter;
    uniform float elapsed, rippleAge, bass, hit, intensity, feedback, mirrorDepth, mirrorEdge, shapeTilt, shapeThickness, shapeSpin;
    uniform int scene;
    out vec4 colour;
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      vec2 d = (uv - point) * vec2(resolution.x / resolution.y, 1.0);
      float radius = length(d);
      vec2 direction = d / max(radius, 0.001);
      float ripple = sin(radius * 48.0 - rippleAge * 17.0)
        * exp(-radius * 4.0 - rippleAge * 1.6) * intensity;
      vec2 warped = uv;
      if (scene == 0) {
        warped += direction * ripple * (0.025 + bass * 0.055);
        warped.x += sin(uv.y * 30.0 + elapsed * 2.0) * bass * intensity * 0.016;
      } else if (scene == 1) {
        warped.x += sin(uv.y * 24.0 + elapsed) * bass * intensity * 0.14;
        warped.x += ripple * 0.065;
        warped.y += sin(uv.x * 17.0 - elapsed) * bass * intensity * 0.012;
      } else if (scene == 2) {
        warped += direction * ripple * 0.02;
      } else if (scene == 4) {
        vec2 p = (uv - vec2(0.5)) * vec2(resolution.x / resolution.y, 1.0);
        float angle = atan(p.y, p.x) + elapsed * (0.12 + bass * 0.18);
        float sector = 1.04719755;
        angle = abs(mod(angle, sector * 2.0) - sector);
        float r = length(p) * (1.0 + 0.12 * intensity * sin(elapsed + length(p) * 12.0));
        warped = vec2(0.5) + vec2(cos(angle), sin(angle)) * r / vec2(resolution.x / resolution.y, 1.0);
      } else if (scene == 5) {
        float bands = floor(uv.y * (12.0 + bass * 18.0));
        float offset = sin(bands * 37.2 + floor(elapsed * 5.0)) * (0.012 + hit * 0.045) * intensity;
        warped.x += offset;
        warped += direction * ripple * 0.025;
      }
      vec3 image = texture(sourceFrame, clamp(warped, 0.0, 1.0)).rgb;
      if (scene == 1) {
        vec3 pulled = texture(sourceFrame, clamp(warped - vec2(bass * intensity * 0.16, 0.0), 0.0, 1.0)).rgb;
        image = mix(image, pulled, min(0.7, bass * intensity));
      }
      if (scene == 2) {
        for (int i = 0; i < 6; i++) {
          float n = float(i);
          float y = 0.1 + n * 0.16 + sin(uv.x * (9.0 + n) + elapsed * (0.8 + n * 0.15)) * (0.05 + bass * 0.1);
          float ribbon = exp(-abs(uv.y - y) * (75.0 - bass * 25.0));
          vec3 sampled = texture(sourceFrame, vec2(fract(uv.x + n * 0.13 + elapsed * 0.025), fract(0.15 + n * 0.15))).rgb;
          image += sampled * ribbon * (0.2 + bass * 0.9) * intensity;
        }
      }
      if (scene == 3) {
        vec2 px = 1.0 / resolution;
        float spread = 4.0 + mirrorEdge * 22.0;
        vec2 stepUV = px * spread;
        float angle = shapeTilt * 0.35 + sin(elapsed * 0.65) * shapeSpin * 0.32;
        vec2 local = uv - shapeCenter;
        vec2 shapeUV = shapeCenter + vec2(cos(angle) * local.x + sin(angle) * local.y,
          -sin(angle) * local.x + cos(angle) * local.y);
        shapeUV.x = shapeCenter.x + (shapeUV.x - shapeCenter.x) / max(0.55, 1.0 - abs(shapeTilt + sin(elapsed * 0.65) * shapeSpin) * 0.3);
        float mask = texture(shapeMask, shapeUV).a;
        float left = texture(shapeMask, shapeUV - vec2(stepUV.x, 0.0)).a;
        float right = texture(shapeMask, shapeUV + vec2(stepUV.x, 0.0)).a;
        float down = texture(shapeMask, shapeUV - vec2(0.0, stepUV.y)).a;
        float up = texture(shapeMask, shapeUV + vec2(0.0, stepUV.y)).a;
        vec2 gradient = vec2(right - left, up - down);
        float edge = clamp(length(gradient), 0.0, 1.0);
        vec2 normal = gradient / max(edge, 0.001);
        float bend = mirrorDepth * intensity * (0.012 + bass * 0.025);
        vec2 outsideUV = clamp(uv - normal * edge * bend * (1.0 - mask), 0.0, 1.0);
        vec3 outside = texture(sourceFrame, outsideUV).rgb;
        vec2 reflectedUV = vec2(2.0 * shapeCenter.x - uv.x, uv.y);
        reflectedUV += normal * bend * (0.5 + 0.5 * sin(elapsed * 1.2 + uv.y * 19.0));
        reflectedUV += direction * ripple * 0.035;
        vec3 reflected = texture(sourceFrame, clamp(reflectedUV, 0.0, 1.0)).rgb;
        float bevel = clamp(mask - 0.55 * (left + right + up + down) * 0.25, 0.0, 1.0);
        float glint = pow(max(dot(normal, normalize(vec2(-0.6, 0.8))), 0.0), 3.0) * edge;
        reflected = reflected * (0.7 + 0.55 * glint + 0.2 * bass) + vec3(0.24, 0.45, 0.58) * (glint + bevel) * mirrorEdge;
        float back = texture(shapeMask, shapeUV + vec2(-0.018, 0.023) * shapeThickness).a;
        float side = max(back - mask, 0.0);
        vec3 sideImage = texture(sourceFrame, clamp(reflectedUV + vec2(0.04, -0.02), 0.0, 1.0)).rgb * 0.34 + vec3(0.08, 0.16, 0.2);
        image = mix(outside, sideImage, side);
        image = mix(image, reflected, mask);
        image += vec3(0.10, 0.28, 0.36) * edge * mirrorEdge * (1.0 - mask) * (0.6 + hit);
      }
      if (scene == 5) {
        float shift = (0.003 + hit * 0.018 + bass * 0.009) * intensity;
        image.r = texture(sourceFrame, clamp(warped + vec2(shift, 0.0), 0.0, 1.0)).r;
        image.b = texture(sourceFrame, clamp(warped - vec2(shift, 0.0), 0.0, 1.0)).b;
      }
      vec2 trailUV = uv - direction * ripple * 0.008;
      if (scene == 1) trailUV.x -= (0.003 + bass * 0.012) * intensity;
      vec3 history = texture(previousFrame, clamp(trailUV, 0.0, 1.0)).rgb;
      float blend = feedback * (scene == 1 ? 0.92 : scene == 3 || scene == 6 ? 0.34 : 0.78);
      colour = vec4(mix(image, history * 0.987, blend) + image * hit * 0.08, 1.0);
    }`;
  const present = `#version 300 es
    precision highp float;
    uniform sampler2D frame;
    uniform vec2 resolution;
    out vec4 colour;
    void main() { colour = texture(frame, gl_FragCoord.xy / resolution); }`;
  const logoVertex = `#version 300 es
    precision highp float;
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec3 normal;
    layout(location = 2) in vec2 texcoord;
    layout(location = 3) in float side;
    uniform vec2 resolution, logoPosition;
    uniform float logoScale, logoDepth, logoRotX, logoRotY, logoRotZ, logoMotion, logoStartAngle, logoEndAngle, elapsed;
    uniform int logoMotionAxis;
    out vec3 surfaceNormal;
    out vec2 uv;
    out float sideFace;
    void main() {
      float sweep = logoMotion > 0.0
        ? radians(mix(logoStartAngle, logoEndAngle, 0.5 - 0.5 * cos(elapsed * logoMotion * 2.0))) : 0.0;
      float x = logoMotion > 0.0 && logoMotionAxis == 0 ? sweep : radians(logoRotX);
      float y = logoMotion > 0.0 && logoMotionAxis == 1 ? sweep : radians(logoRotY);
      float z = logoMotion > 0.0 && logoMotionAxis == 2 ? sweep : radians(logoRotZ);
      float cx = cos(x), sx = sin(x), cy = cos(y), sy = sin(y), cz = cos(z), sz = sin(z);
      mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
      mat3 ry = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
      mat3 rz = mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0);
      mat3 rotation = rz * ry * rx;
      float scale = logoScale * 0.5;
      float aspect = resolution.x / resolution.y;
      vec3 world = rotation * vec3(position.xy, position.z * logoDepth) * scale;
      world.xy += (logoPosition - vec2(0.5)) * vec2(aspect, 1.0);
      float perspective = 5.0 / (5.0 - world.z);
      gl_Position = vec4(world.xy * vec2(2.0 / aspect, 2.0) * perspective, -world.z / 5.0, 1.0);
      surfaceNormal = normalize(rotation * normal);
      uv = texcoord;
      sideFace = side;
    }`;
  const logoFragment = `#version 300 es
    precision highp float;
    uniform sampler2D sourceFrame, logoTexture;
    uniform vec2 resolution;
    uniform float bass, hit, intensity;
    in vec3 surfaceNormal;
    in vec2 uv;
    in float sideFace;
    out vec4 colour;
    void main() {
      vec3 normal = normalize(surfaceNormal);
      vec3 light = normalize(vec3(-0.45, 0.7, 0.7));
      vec4 surface = texture(logoTexture, uv);
      if (sideFace < 0.5 && surface.a < 0.01) discard;
      vec3 pigment = surface.rgb;
      vec2 reflectedUV = clamp(gl_FragCoord.xy / resolution + normal.xy * (0.045 + bass * 0.035) * intensity, 0.0, 1.0);
      vec3 reflection = texture(sourceFrame, reflectedUV).rgb;
      float diffuse = max(dot(normal, light), 0.0);
      float shine = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
      float edge = pow(1.0 - max(normal.z, 0.0), 2.0);
      vec3 material = mix(pigment * 0.82 + reflection * 0.18, pigment * 0.23 + reflection * 0.42, sideFace);
      material *= mix(0.78 + diffuse * 0.34, 0.42 + diffuse * 0.78, sideFace);
      material += vec3(0.75, 0.88, 1.0) * (shine * (0.36 + hit * 0.3) + edge * 0.08);
      colour = vec4(material, sideFace > 0.5 ? 1.0 : surface.a);
    }`;

  class VfxEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl2', { alpha: false, antialias: true, depth: true });
      if (!this.gl) throw new Error('WebGL 2 is unavailable');
      const gl = this.gl;
      this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const compileProgram = (fragment, vertexCode = vertex) => {
        const program = gl.createProgram();
        for (const [type, code] of [[gl.VERTEX_SHADER, vertexCode], [gl.FRAGMENT_SHADER, fragment]]) {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, code);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
          gl.attachShader(program, shader);
          gl.deleteShader(shader);
        }
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
        return program;
      };
      this.effectProgram = compileProgram(effect);
      this.presentProgram = compileProgram(present);
      this.logoProgram = compileProgram(logoFragment, logoVertex);
      this.uniforms = Object.fromEntries(
        ['sourceFrame', 'previousFrame', 'shapeMask', 'resolution', 'point', 'shapeCenter', 'elapsed', 'rippleAge', 'bass', 'hit', 'intensity', 'feedback', 'mirrorDepth', 'mirrorEdge', 'shapeTilt', 'shapeThickness', 'shapeSpin', 'scene']
          .map(name => [name, gl.getUniformLocation(this.effectProgram, name)]));
      this.presentUniforms = {
        frame: gl.getUniformLocation(this.presentProgram, 'frame'),
        resolution: gl.getUniformLocation(this.presentProgram, 'resolution')
      };
      this.logoUniforms = Object.fromEntries(
        ['sourceFrame', 'logoTexture', 'resolution', 'logoPosition', 'logoScale', 'logoDepth', 'logoRotX', 'logoRotY', 'logoRotZ', 'logoMotion', 'logoMotionAxis', 'logoStartAngle', 'logoEndAngle', 'elapsed', 'bass', 'hit', 'intensity']
          .map(name => [name, gl.getUniformLocation(this.logoProgram, name)]));
      this.fullscreenVao = gl.createVertexArray();
      gl.bindVertexArray(this.fullscreenVao);
      const makeTexture = () => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return texture;
      };
      this.source = makeTexture();
      this.maskTexture = makeTexture();
      this.logoTexture = makeTexture();
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.logoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      this.logo3d = { kind: 'logo', text: '@tonyt.dj', x: 0.5, y: 0.5, scale: 0.48, depth: 0.45,
        rotX: 0, rotY: -20, rotZ: 0, motion: 0.25, axis: 'y', startAngle: -45, endAngle: 45 };
      this.logoMotionStart = performance.now() / 1000;
      this.logoMeshVao = gl.createVertexArray();
      this.logoMeshBuffer = gl.createBuffer();
      this.logoMeshVertexCount = 0;
      const logoImage = new Image();
      logoImage.onload = () => {
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 2092;
        logoCanvas.height = 336;
        logoCanvas.getContext('2d').drawImage(logoImage, 0, 20, 523, 84, 0, 0, 2092, 336);
        this.logoSource = logoCanvas;
        if (this.logo3d.kind === 'logo') this.uploadLogoSurface(logoCanvas);
      };
      logoImage.src = '/assets/version1-hero.svg';
      this.textFontReady = false;
      const font = new FontFace('Version1 Bungee', 'url(/assets/Bungee-Regular.ttf)');
      font.load().then(loaded => {
        document.fonts.add(loaded);
        this.textFontReady = true;
        if (this.logo3d.kind === 'text') this.renderLogoText();
      }).catch(error => console.error('Version1 font unavailable:', error));
      this.maskCanvas = document.createElement('canvas');
      this.maskContext = this.maskCanvas.getContext('2d');
      this.shape = { kind: 'text', text: 'CLUB', x: 0.5, y: 0.5, scale: 0.7, depth: 1, edge: 0.7, tilt: 0, thickness: 0.8, spin: 0.3 };
      this.shapeImage = null;
      this.maskDirty = true;
      this.targets = [0, 1].map(() => ({ texture: makeTexture(), framebuffer: gl.createFramebuffer() }));
      this.previous = 0;
      this.rippleStart = -100;
      this.point = [0.5, 0.5];
    }

    setShape(shape) {
      const previousImage = this.shape.image;
      this.shape = { ...this.shape, ...shape };
      this.maskDirty = true;
      if (this.shape.kind !== 'image') {
        this.shapeImage = null;
        return;
      }
      if (this.shape.kind === 'image' && this.shape.image && (this.shape.image !== previousImage || !this.shapeImage)) {
        this.shapeImage = null;
        const requestedImage = this.shape.image;
        const image = new Image();
        image.onload = () => { if (this.shape.kind === 'image' && this.shape.image === requestedImage) { this.shapeImage = image; this.maskDirty = true; } };
        image.onerror = () => { if (this.shape.kind === 'image' && this.shape.image === requestedImage) { this.shapeImage = null; this.maskDirty = true; } };
        image.src = requestedImage;
      }
    }

    setLogo3d(settings) {
      const previousKind = this.logo3d.kind;
      const previousText = this.logo3d.text;
      if (['kind', 'motion', 'axis', 'startAngle', 'endAngle'].some(key => settings[key] !== undefined && settings[key] !== this.logo3d[key]))
        this.logoMotionStart = performance.now() / 1000;
      this.logo3d = { ...this.logo3d, ...settings };
      if (this.logo3d.kind === 'text' && (previousKind !== 'text' || previousText !== this.logo3d.text)) {
        if (this.textFontReady) this.renderLogoText();
        else this.logoMeshVertexCount = 0;
      } else if (this.logo3d.kind === 'logo' && previousKind !== 'logo') {
        if (this.logoSource) this.uploadLogoSurface(this.logoSource);
        else this.logoMeshVertexCount = 0;
      }
    }

    renderLogoText() {
      const value = String(this.logo3d.text || '').slice(0, 40).trim();
      if (!value) { this.logoMeshVertexCount = 0; return; }
      const handle = value.startsWith('@') ? value.slice(1) : value;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let fontSize = 352;
      const measure = () => {
        ctx.font = `${fontSize}px "Version1 Bungee"`;
        return ctx.measureText('@').width + ctx.measureText(handle).width;
      };
      let width = measure();
      if (width > 3800) { fontSize *= 3800 / width; width = measure(); }
      canvas.width = Math.ceil(width + 88);
      canvas.height = 480;
      ctx.font = `${fontSize}px "Version1 Bungee"`;
      ctx.textBaseline = 'middle';
      const x = 44, y = canvas.height / 2;
      ctx.fillStyle = '#e20d22';
      ctx.fillText('@', x, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(handle, x + ctx.measureText('@').width, y);
      this.uploadLogoSurface(canvas);
    }

    uploadLogoSurface(canvas) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.logoTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      const meshCanvas = document.createElement('canvas');
      meshCanvas.width = Math.min(1200, Math.max(1, Math.round(canvas.width / 2)));
      meshCanvas.height = Math.max(1, Math.round(meshCanvas.width * canvas.height / canvas.width));
      const meshContext = meshCanvas.getContext('2d');
      meshContext.imageSmoothingQuality = 'high';
      meshContext.drawImage(canvas, 0, 0, meshCanvas.width, meshCanvas.height);
      this.buildLogoMesh(meshCanvas);
    }

    buildLogoMesh(canvas) {
      const gl = this.gl;
      const width = canvas.width, height = canvas.height;
      const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
      const alpha = (x, y) => pixels[(y * width + x) * 4 + 3] / 255;
      const aspect = width / height;
      const point = (x, y, z) => [(x / width - 0.5) * aspect, 0.5 - y / height, z];
      const uv = (x, y) => [x / width, 1 - y / height];
      const vertices = [];
      const push = (p, n, t, side) => vertices.push(...p, ...n, ...t, side);
      const quad = (a, b, c, d, normal, texA, texB, texC, texD, side = 0) => {
        push(a, normal, texA, side); push(b, normal, texB, side); push(c, normal, texC, side);
        push(a, normal, texA, side); push(c, normal, texC, side); push(d, normal, texD, side);
      };
      // The front and back retain the source image's smooth alpha edges.
      quad(point(0, 0, 0.5), point(width, 0, 0.5), point(width, height, 0.5), point(0, height, 0.5),
        [0, 0, 1], uv(0, 0), uv(width, 0), uv(width, height), uv(0, height));
      quad(point(width, 0, -0.5), point(0, 0, -0.5), point(0, height, -0.5), point(width, height, -0.5),
        [0, 0, -1], uv(width, 0), uv(0, 0), uv(0, height), uv(width, height));

      // Follow the half-alpha contour for the extrusion instead of making a
      // square wall for each mask pixel. Each edge crossing is interpolated.
      const threshold = 0.5;
      for (let y = 0; y < height - 1; y++) for (let x = 0; x < width - 1; x++) {
        const values = [alpha(x, y), alpha(x + 1, y), alpha(x + 1, y + 1), alpha(x, y + 1)];
        const inside = values.map(value => value >= threshold);
        const crossing = (a, b) => inside[a] !== inside[b];
        const edgePoint = (edge) => {
          const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
          const a = edge, b = (edge + 1) % 4;
          const t = Math.max(0, Math.min(1, (threshold - values[a]) / (values[b] - values[a])));
          return [corners[a][0] + (corners[b][0] - corners[a][0]) * t,
            corners[a][1] + (corners[b][1] - corners[a][1]) * t];
        };
        const edges = [0, 1, 2, 3].filter(edge => crossing(edge, (edge + 1) % 4));
        if (!edges.length) continue;
        const gx = (values[1] + values[2] - values[0] - values[3]) * 0.5;
        const gy = (values[2] + values[3] - values[0] - values[1]) * 0.5;
        const gradientLength = Math.hypot(gx, gy) || 1;
        const normal = [-gx / gradientLength, gy / gradientLength, 0];
        const segment = (startEdge, endEdge) => {
          const a = edgePoint(startEdge), b = edgePoint(endEdge);
          const sampleX = Math.max(0, Math.min(width, (a[0] + b[0]) / 2 + gx / gradientLength));
          const sampleY = Math.max(0, Math.min(height, (a[1] + b[1]) / 2 + gy / gradientLength));
          const colourUv = uv(sampleX, sampleY);
          quad(point(a[0], a[1], 0.5), point(b[0], b[1], 0.5),
            point(b[0], b[1], -0.5), point(a[0], a[1], -0.5),
            normal, colourUv, colourUv, colourUv, colourUv, 1);
        };
        if (edges.length === 2) segment(edges[0], edges[1]);
        else if (edges.length === 4) {
          const centreInside = values.reduce((sum, value) => sum + value, 0) / 4 >= threshold;
          if (centreInside === inside[0]) { segment(0, 1); segment(2, 3); }
          else { segment(0, 3); segment(1, 2); }
        }
      }
      const data = new Float32Array(vertices);
      this.logoMeshVertexCount = data.length / 9;
      gl.bindVertexArray(this.logoMeshVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.logoMeshBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      for (const [location, count, offset] of [[0, 3, 0], [1, 3, 3], [2, 2, 6], [3, 1, 8]]) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, count, gl.FLOAT, false, 36, offset * 4);
      }
      gl.bindVertexArray(this.fullscreenVao);
    }

    updateMask(width, height) {
      const gl = this.gl;
      const canvas = this.maskCanvas;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        this.maskDirty = true;
      }
      if (!this.maskDirty) return;
      const ctx = this.maskContext;
      ctx.clearRect(0, 0, width, height);
      const shape = this.shape;
      const x = Math.max(0, Math.min(1, shape.x)) * width;
      const y = (1 - Math.max(0, Math.min(1, shape.y))) * height;
      if (shape.kind === 'image' && this.shapeImage?.complete && this.shapeImage.naturalWidth) {
        const aspect = this.shapeImage.naturalWidth / this.shapeImage.naturalHeight;
        const w = Math.min(width * shape.scale, height * shape.scale * aspect);
        const h = w / aspect;
        ctx.drawImage(this.shapeImage, x - w / 2, y - h / 2, w, h);
      } else if (shape.kind === 'text' && shape.text) {
        const text = String(shape.text).slice(0, 40);
        let fontSize = Math.max(12, height * shape.scale * 0.48);
        ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
        const measured = ctx.measureText(text).width;
        if (measured > width * 0.9) fontSize *= width * 0.9 / measured;
        ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x, y);
      }
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      this.maskDirty = false;
    }

    pulse(x = Math.random() * 0.6 + 0.2, y = Math.random() * 0.6 + 0.2) {
      this.point = [x, y];
      this.rippleStart = performance.now() / 1000;
    }

    resize(width, height) {
      const gl = this.gl;
      if (this.canvas.width === width && this.canvas.height === height) return;
      this.canvas.width = width;
      this.canvas.height = height;
      for (const target of this.targets) {
        gl.bindTexture(gl.TEXTURE_2D, target.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('VFX framebuffer incomplete');
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      this.previous = 0;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    render(source, state) {
      if (!source.width || !source.height) return;
      this.resize(source.width, source.height);
      this.updateMask(source.width, source.height);
      const gl = this.gl;
      const now = performance.now() / 1000;
      gl.viewport(0, 0, source.width, source.height);
      gl.bindVertexArray(this.fullscreenVao);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.source);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      const next = 1 - this.previous;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[next].framebuffer);
      gl.useProgram(this.effectProgram);
      gl.uniform1i(this.uniforms.sourceFrame, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.targets[this.previous].texture);
      gl.uniform1i(this.uniforms.previousFrame, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.uniform1i(this.uniforms.shapeMask, 2);
      gl.uniform2f(this.uniforms.resolution, source.width, source.height);
      gl.uniform2f(this.uniforms.point, this.point[0], this.point[1]);
      gl.uniform2f(this.uniforms.shapeCenter, this.shape.x, this.shape.y);
      gl.uniform1f(this.uniforms.elapsed, now);
      gl.uniform1f(this.uniforms.rippleAge, Math.max(0, now - this.rippleStart));
      gl.uniform1f(this.uniforms.bass, state.bass || 0);
      gl.uniform1f(this.uniforms.hit, state.hit || 0);
      gl.uniform1f(this.uniforms.intensity, state.intensity);
      gl.uniform1f(this.uniforms.feedback, state.feedback);
      gl.uniform1f(this.uniforms.mirrorDepth, this.shape.depth);
      gl.uniform1f(this.uniforms.mirrorEdge, this.shape.edge);
      gl.uniform1f(this.uniforms.shapeTilt, this.shape.tilt);
      gl.uniform1f(this.uniforms.shapeThickness, this.shape.thickness);
      gl.uniform1f(this.uniforms.shapeSpin, this.shape.spin);
      gl.uniform1i(this.uniforms.scene, state.scene);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(this.presentProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.targets[next].texture);
      gl.uniform1i(this.presentUniforms.frame, 0);
      gl.uniform2f(this.presentUniforms.resolution, source.width, source.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (state.scene === 6 && this.logoMeshVertexCount) {
        const u = this.logoUniforms;
        const logo = this.logo3d;
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(this.logoProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.source);
        gl.uniform1i(u.sourceFrame, 0);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.logoTexture);
        gl.uniform1i(u.logoTexture, 3);
        gl.uniform2f(u.resolution, source.width, source.height);
        gl.uniform2f(u.logoPosition, logo.x, logo.y);
        gl.uniform1f(u.logoScale, logo.scale);
        gl.uniform1f(u.logoDepth, logo.depth);
        gl.uniform1f(u.logoRotX, logo.rotX);
        gl.uniform1f(u.logoRotY, logo.rotY);
        gl.uniform1f(u.logoRotZ, logo.rotZ);
        gl.uniform1f(u.logoMotion, logo.motion);
        gl.uniform1i(u.logoMotionAxis, { x: 0, y: 1, z: 2 }[logo.axis] ?? 1);
        gl.uniform1f(u.logoStartAngle, logo.startAngle);
        gl.uniform1f(u.logoEndAngle, logo.endAngle);
        gl.uniform1f(u.elapsed, now - this.logoMotionStart);
        gl.uniform1f(u.bass, state.bass || 0);
        gl.uniform1f(u.hit, state.hit || 0);
        gl.uniform1f(u.intensity, state.intensity);
        gl.bindVertexArray(this.logoMeshVao);
        gl.drawArrays(gl.TRIANGLES, 0, this.logoMeshVertexCount);
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.bindVertexArray(this.fullscreenVao);
      }
      this.previous = next;
    }
  }
  window.VfxEngine = VfxEngine;
})();
