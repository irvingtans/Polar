(function () {
  const COMPONENT_BYTES = {
    5120: 1,
    5121: 1,
    5122: 2,
    5123: 2,
    5125: 4,
    5126: 4,
  };

  const COMPONENT_GETTERS = {
    5120: "getInt8",
    5121: "getUint8",
    5122: "getInt16",
    5123: "getUint16",
    5125: "getUint32",
    5126: "getFloat32",
  };

  const TYPE_COMPONENTS = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT4: 16,
  };

  const GLASS_ALPHA_BY_VLT = {
    70: 0.16,
    50: 0.42,
    30: 0.68,
    15: 0.78,
    10: 0.88,
  };

  const GLASS_COLOR_BY_VLT = {
    70: [0.08, 0.42, 0.62],
    50: [0.005, 0.12, 0.24],
    30: [0.001, 0.002, 0.003],
    15: [0.0, 0.0, 0.001],
    10: [0.0, 0.0, 0.0],
  };

  const GLASS_LIGHT_MIX_BY_VLT = {
    70: 0.24,
    50: 0.16,
    30: 0.05,
    15: 0.025,
    10: 0.01,
  };

  function identity() {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  }

  function multiply(a, b) {
    const out = new Array(16);
    for (let col = 0; col < 4; col += 1) {
      for (let row = 0; row < 4; row += 1) {
        out[col * 4 + row] =
          a[0 * 4 + row] * b[col * 4 + 0] +
          a[1 * 4 + row] * b[col * 4 + 1] +
          a[2 * 4 + row] * b[col * 4 + 2] +
          a[3 * 4 + row] * b[col * 4 + 3];
      }
    }
    return out;
  }

  function transformPoint(m, point) {
    const x = point[0];
    const y = point[1];
    const z = point[2];
    return [
      m[0] * x + m[4] * y + m[8] * z + m[12],
      m[1] * x + m[5] * y + m[9] * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14],
    ];
  }

  function transformNormal(m, normal) {
    const x = m[0] * normal[0] + m[4] * normal[1] + m[8] * normal[2];
    const y = m[1] * normal[0] + m[5] * normal[1] + m[9] * normal[2];
    const z = m[2] * normal[0] + m[6] * normal[1] + m[10] * normal[2];
    const length = Math.hypot(x, y, z) || 1;
    return [x / length, y / length, z / length];
  }

  function normalizeVector(vector) {
    const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
    return [vector[0] / length, vector[1] / length, vector[2] / length];
  }

  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  function addScaled(point, axis, amount) {
    return [
      point[0] + axis[0] * amount,
      point[1] + axis[1] * amount,
      point[2] + axis[2] * amount,
    ];
  }

  function trsMatrix(node) {
    if (node.matrix) return node.matrix.slice();
    const t = node.translation || [0, 0, 0];
    const r = node.rotation || [0, 0, 0, 1];
    const s = node.scale || [1, 1, 1];
    const x = r[0];
    const y = r[1];
    const z = r[2];
    const w = r[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    return [
      (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
      (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
      (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
      t[0], t[1], t[2], 1,
    ];
  }

  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ];
  }

  function lookAt(eye, target, up) {
    let zx = eye[0] - target[0];
    let zy = eye[1] - target[1];
    let zz = eye[2] - target[2];
    let zLength = Math.hypot(zx, zy, zz) || 1;
    zx /= zLength;
    zy /= zLength;
    zz /= zLength;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    let xLength = Math.hypot(xx, xy, xz) || 1;
    xx /= xLength;
    xy /= xLength;
    xz /= xLength;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    return [
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1,
    ];
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "Shader compile failed");
    }
    return shader;
  }

  function createProgram(gl) {
    const vertex = createShader(gl, gl.VERTEX_SHADER, `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uMvp;
      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vNormal = aNormal;
        vWorld = aPosition;
        gl_Position = uMvp * vec4(aPosition, 1.0);
      }
    `);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec3 vNormal;
      varying vec3 vWorld;
      uniform vec4 uColor;
      uniform vec3 uLight;
      uniform float uGlass;
      uniform float uPaint;
      uniform float uGlassMix;

      void main() {
        vec3 n = normalize(vNormal);
        float key = max(dot(n, normalize(uLight)), 0.0);
        float fill = max(dot(n, normalize(vec3(0.58, 0.62, -0.48))), 0.0);
        float top = max(n.y, 0.0);
        float rim = pow(1.0 - max(abs(n.z), 0.0), 2.0) * 0.08;
        float shade = 0.7 + key * 0.18 + fill * 0.12 + top * 0.06;
        if (uPaint > 0.5) {
          shade = 0.88 + key * 0.08 + fill * 0.06 + top * 0.04;
        }
        vec3 color = min(uColor.rgb * shade + vec3(rim), vec3(1.0));
        if (uGlass > 0.5) {
          color = mix(uColor.rgb, color, uGlassMix);
        }
        gl_FragColor = vec4(color, uColor.a);
      }
    `);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
    }
    return program;
  }

  class PolarGlbViewer {
    constructor(container, options) {
      this.container = container;
      this.canvas = container.querySelector("[data-car-canvas]");
      this.src = options.src;
      this.windowGlassMaterialPattern = /vidro|glass|window|windshield/i;
      this.lightLensMaterialPattern = /vermelh|lanterna|farol|headlight|taillight|brake|lamp|reflector|refletor/i;
      this.meshes = [];
      this.plateSurfaces = [];
      this.center = [0, 0, 0];
      this.radius = 1;
      this.yaw = -0.55;
      this.pitch = -0.18;
      this.distance = 7;
      this.dragging = false;
      this.pointer = { x: 0, y: 0 };
      this.vlt = 30;
      this.ready = false;
    }

    async load() {
      if (!this.canvas) return;
      this.gl = this.canvas.getContext("webgl", {
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
      });
      if (!this.gl) throw new Error("WebGL unavailable");
      this.supportsUintIndices = Boolean(this.gl.getExtension("OES_element_index_uint"));

      const arrayBuffer = await this.loadArrayBuffer(this.src);
      this.parseGlb(arrayBuffer);
      this.setupGl();
      this.bindControls();
      this.ready = true;
      this.container.classList.add("is-3d-ready");
      window.requestAnimationFrame(() => this.draw());
    }

    async loadArrayBuffer(src) {
      if (window.location.protocol === "file:" && window.POLAR_VELAR_GLB_BASE64_CHUNKS) {
        return this.loadEmbeddedArrayBuffer();
      }

      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Could not load ${src}`);
        return await response.arrayBuffer();
      } catch (error) {
        try {
          return await this.loadArrayBufferWithXhr(src, error);
        } catch (xhrError) {
          if (window.POLAR_VELAR_GLB_BASE64_CHUNKS) return this.loadEmbeddedArrayBuffer();
          throw xhrError;
        }
      }
    }

    loadArrayBufferWithXhr(src, originalError) {
      return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", src, true);
        request.responseType = "arraybuffer";
        request.onload = () => {
          if (request.status === 0 || (request.status >= 200 && request.status < 300)) {
            resolve(request.response);
            return;
          }
          reject(originalError);
        };
        request.onerror = () => reject(originalError);
        request.send();
      });
    }

    loadEmbeddedArrayBuffer() {
      const chunks = window.POLAR_VELAR_GLB_BASE64_CHUNKS;
      if (!chunks?.length) throw new Error("Embedded GLB is missing");

      const byteLength = chunks.reduce((total, chunk) => {
        const padding = chunk.endsWith("==") ? 2 : chunk.endsWith("=") ? 1 : 0;
        return total + Math.floor((chunk.length * 3) / 4) - padding;
      }, 0);
      const bytes = new Uint8Array(byteLength);
      let offset = 0;

      chunks.forEach((chunk) => {
        const binary = window.atob(chunk);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[offset] = binary.charCodeAt(i);
          offset += 1;
        }
      });

      return bytes.buffer;
    }

    setVlt(vlt) {
      this.vlt = vlt;
    }

    parseGlb(arrayBuffer) {
      const data = new DataView(arrayBuffer);
      const magic = data.getUint32(0, true);
      if (magic !== 0x46546c67) throw new Error("Invalid GLB");
      let offset = 12;
      let json = null;
      let binOffset = 0;
      let binLength = 0;

      while (offset < data.byteLength) {
        const chunkLength = data.getUint32(offset, true);
        const chunkType = data.getUint32(offset + 4, true);
        offset += 8;
        if (chunkType === 0x4e4f534a) {
          json = JSON.parse(new TextDecoder().decode(arrayBuffer.slice(offset, offset + chunkLength)));
        }
        if (chunkType === 0x004e4942) {
          binOffset = offset;
          binLength = chunkLength;
        }
        offset += chunkLength;
      }

      if (!json || !binLength) throw new Error("GLB is missing data");
      this.gltf = json;
      this.binary = arrayBuffer;
      this.binOffset = binOffset;
      this.materials = (json.materials || []).map((material) => this.materialInfo(material));
      const scene = json.scenes?.[json.scene || 0] || json.scenes?.[0];
      const roots = scene?.nodes || [];
      roots.forEach((nodeIndex) => this.walkNode(nodeIndex, identity()));
      this.finishBounds();
      this.addPlateDecals();
    }

    materialInfo(material = {}) {
      const pbr = material.pbrMetallicRoughness || {};
      const base = pbr.baseColorFactor || [0.78, 0.78, 0.78, 1];
      const name = material.name || "";
      const isLightLens = this.lightLensMaterialPattern.test(name);
      const isTailLens = /vermelh|lanterna|taillight|brake/i.test(name);
      const isHeadLens = /farol|headlight/i.test(name);
      const isGlass = this.windowGlassMaterialPattern.test(name) && !isLightLens;
      const isPaint = /pintura|paint|body/i.test(name);
      const isPlateBase = /placa branco|placa mercosul/i.test(name);
      const isPlateDetail = /placa preto|placa azul|placa bandeira|placa qrcode/i.test(name);
      const color = isGlass
        ? [0.02, 0.08, 0.1, 0.34]
        : isTailLens
          ? [0.82, 0.03, 0.04, 1]
          : isHeadLens
            ? [0.93, 0.94, 0.88, 1]
            : isPlateBase
              ? [0.015, 0.06, 0.085, 1]
              : isPlateDetail
                ? [0.02, 0.55, 0.88, 1]
                : base;
      return {
        name,
        isGlass,
        isPaint,
        isPlateBase,
        color,
      };
    }

    walkNode(nodeIndex, parentMatrix) {
      const node = this.gltf.nodes[nodeIndex];
      const world = multiply(parentMatrix, trsMatrix(node));
      if (typeof node.mesh === "number") {
        this.addMesh(this.gltf.meshes[node.mesh], world);
      }
      (node.children || []).forEach((childIndex) => this.walkNode(childIndex, world));
    }

    readAccessor(index) {
      const accessor = this.gltf.accessors[index];
      const view = this.gltf.bufferViews[accessor.bufferView];
      const components = TYPE_COMPONENTS[accessor.type];
      const componentBytes = COMPONENT_BYTES[accessor.componentType];
      const getter = COMPONENT_GETTERS[accessor.componentType];
      const byteOffset = this.binOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0);
      const stride = view.byteStride || componentBytes * components;
      const result = new Array(accessor.count);
      const data = new DataView(this.binary, byteOffset, (view.byteLength || 0) - (accessor.byteOffset || 0));

      for (let i = 0; i < accessor.count; i += 1) {
        const item = [];
        for (let c = 0; c < components; c += 1) {
          item.push(data[getter](i * stride + c * componentBytes, true));
        }
        result[i] = item;
      }
      return result;
    }

    addMesh(mesh, matrix) {
      (mesh.primitives || []).forEach((primitive) => {
        if (primitive.mode !== undefined && primitive.mode !== 4) return;
        if (primitive.attributes.POSITION === undefined) return;
        const positions = this.readAccessor(primitive.attributes.POSITION);
        const normals = primitive.attributes.NORMAL !== undefined
          ? this.readAccessor(primitive.attributes.NORMAL)
          : positions.map(() => [0, 1, 0]);
        const indices = primitive.indices !== undefined
          ? this.readAccessor(primitive.indices).map((item) => item[0])
          : positions.map((_, index) => index);
        const vertices = new Float32Array(positions.length * 6);
        const transformedPositions = new Array(positions.length);
        const transformedNormals = new Array(positions.length);

        positions.forEach((position, index) => {
          const transformed = transformPoint(matrix, position);
          const normal = transformNormal(matrix, normals[index] || [0, 1, 0]);
          transformedPositions[index] = transformed;
          transformedNormals[index] = normal;
          vertices.set(transformed, index * 6);
          vertices.set(normal, index * 6 + 3);
          this.includeBounds(transformed);
        });

        const material = this.materials[primitive.material] || this.materialInfo();
        if (material.isPlateBase) {
          this.plateSurfaces.push(this.describePlateSurface(transformedPositions, transformedNormals));
        }
        this.meshes.push({
          vertices,
          indices: new Uint32Array(indices),
          material,
        });
      });
    }

    describePlateSurface(points, normals) {
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      const center = [0, 0, 0];
      const normal = [0, 0, 0];

      points.forEach((point, index) => {
        for (let i = 0; i < 3; i += 1) {
          min[i] = Math.min(min[i], point[i]);
          max[i] = Math.max(max[i], point[i]);
          normal[i] += normals[index]?.[i] || 0;
        }
      });

      for (let i = 0; i < 3; i += 1) center[i] = (min[i] + max[i]) / 2;
      const n = normalizeVector(normal);
      const u = n[2] < 0 ? [-1, 0, 0] : [1, 0, 0];
      let v = normalizeVector(cross(n, u));
      if (v[1] < 0) v = [-v[0], -v[1], -v[2]];

      return {
        center,
        normal: n,
        u,
        v,
        width: Math.max(0.01, max[0] - min[0]),
        height: Math.max(0.01, max[1] - min[1]),
      };
    }

    addPlateDecals() {
      this.plateSurfaces.forEach((surface) => {
        this.addPlateRectangle(surface, 0, 0, surface.width * 0.96, surface.height * 0.84, [0.01, 0.055, 0.08, 1], 0.006);
        this.addPlateWord(surface);
      });
    }

    addPlateWord(surface) {
      const font = {
        P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
        O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
        L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
        A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
        R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
      };
      const word = "POLAR";
      const cols = word.length * 5 + (word.length - 1);
      const rows = 7;
      const cell = Math.min((surface.width * 0.58) / cols, (surface.height * 0.54) / rows);
      const block = cell * 0.76;
      const actualWidth = cols * cell;
      const actualHeight = rows * cell;
      const startX = -actualWidth / 2 + cell / 2 - surface.width * 0.045;
      const startY = actualHeight / 2 - cell / 2;

      word.split("").forEach((letter, letterIndex) => {
        const glyph = font[letter];
        const letterOffset = letterIndex * 6 * cell;
        glyph.forEach((row, rowIndex) => {
          row.split("").forEach((enabled, colIndex) => {
            if (enabled !== "1") return;
            const x = startX + letterOffset + colIndex * cell;
            const y = startY - rowIndex * cell;
            this.addPlateRectangle(surface, x, y, block, block, [0.96, 0.99, 1, 1], 0.009);
          });
        });
      });

      const markX = actualWidth / 2 + surface.width * 0.03;
      const markColor = [0.0, 0.58, 0.9, 1];
      this.addPlateRectangle(surface, markX, 0, cell * 0.85, cell * 3.4, markColor, 0.01);
      this.addPlateRectangle(surface, markX, 0, cell * 3.4, cell * 0.85, markColor, 0.0105);
      this.addPlateRectangle(surface, markX - cell * 1.1, cell * 1.1, cell * 0.85, cell * 0.85, markColor, 0.011);
      this.addPlateRectangle(surface, markX + cell * 1.1, -cell * 1.1, cell * 0.85, cell * 0.85, markColor, 0.011);
    }

    addPlateRectangle(surface, x, y, width, height, color, offset) {
      const center = addScaled(addScaled(addScaled(surface.center, surface.u, x), surface.v, y), surface.normal, offset);
      const halfU = width / 2;
      const halfV = height / 2;
      const corners = [
        addScaled(addScaled(center, surface.u, -halfU), surface.v, -halfV),
        addScaled(addScaled(center, surface.u, halfU), surface.v, -halfV),
        addScaled(addScaled(center, surface.u, halfU), surface.v, halfV),
        addScaled(addScaled(center, surface.u, -halfU), surface.v, halfV),
      ];
      const vertices = new Float32Array(24);
      corners.forEach((corner, index) => {
        vertices.set(corner, index * 6);
        vertices.set(surface.normal, index * 6 + 3);
      });

      this.meshes.push({
        vertices,
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        material: {
          name: "Polar plate decal",
          isGlass: false,
          isPaint: false,
          color,
        },
      });
    }

    includeBounds(point) {
      if (!this.min) {
        this.min = point.slice();
        this.max = point.slice();
        return;
      }
      for (let i = 0; i < 3; i += 1) {
        this.min[i] = Math.min(this.min[i], point[i]);
        this.max[i] = Math.max(this.max[i], point[i]);
      }
    }

    finishBounds() {
      if (!this.min || !this.max) return;
      this.center = [
        (this.min[0] + this.max[0]) / 2,
        (this.min[1] + this.max[1]) / 2,
        (this.min[2] + this.max[2]) / 2,
      ];
      const size = [
        this.max[0] - this.min[0],
        this.max[1] - this.min[1],
        this.max[2] - this.min[2],
      ];
      this.radius = Math.max(size[0], size[1], size[2]) || 1;
      this.distance = this.radius * 1.35;
    }

    setupGl() {
      const gl = this.gl;
      this.program = createProgram(gl);
      this.locations = {
        position: gl.getAttribLocation(this.program, "aPosition"),
        normal: gl.getAttribLocation(this.program, "aNormal"),
        mvp: gl.getUniformLocation(this.program, "uMvp"),
        color: gl.getUniformLocation(this.program, "uColor"),
        light: gl.getUniformLocation(this.program, "uLight"),
        glass: gl.getUniformLocation(this.program, "uGlass"),
        paint: gl.getUniformLocation(this.program, "uPaint"),
        glassMix: gl.getUniformLocation(this.program, "uGlassMix"),
      };

      this.meshes.forEach((mesh) => {
        const maxIndex = mesh.indices.reduce((max, index) => Math.max(max, index), 0);
        const useUint = this.supportsUintIndices || maxIndex > 65535;
        if (!this.supportsUintIndices && maxIndex > 65535) {
          mesh.renderable = false;
          return;
        }
        mesh.renderable = true;
        mesh.indexType = useUint ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
        const indexData = useUint ? mesh.indices : new Uint16Array(mesh.indices);
        mesh.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
        mesh.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
      });
    }

    bindControls() {
      this.container.addEventListener("pointerdown", (event) => {
        if (!this.ready || this.container.dataset.view === "inside") return;
        this.dragging = true;
        this.pointer = { x: event.clientX, y: event.clientY };
        this.container.classList.add("is-dragging");
        this.container.setPointerCapture(event.pointerId);
      });

      this.container.addEventListener("pointermove", (event) => {
        if (!this.dragging || this.container.dataset.view === "inside") return;
        const dx = event.clientX - this.pointer.x;
        const dy = event.clientY - this.pointer.y;
        this.yaw -= dx * 0.01;
        this.pitch = Math.max(-0.55, Math.min(0.25, this.pitch + dy * 0.006));
        this.pointer = { x: event.clientX, y: event.clientY };
      });

      this.container.addEventListener("pointerup", (event) => {
        this.dragging = false;
        this.container.classList.remove("is-dragging");
        this.container.releasePointerCapture(event.pointerId);
      });

      this.container.addEventListener("pointercancel", () => {
        this.dragging = false;
        this.container.classList.remove("is-dragging");
      });
    }

    resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(this.canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(this.canvas.clientHeight * ratio));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
    }

    draw() {
      if (!this.ready) return;
      this.resize();
      const gl = this.gl;
      const width = this.canvas.width;
      const height = this.canvas.height;
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.useProgram(this.program);

      const orbitX = Math.sin(this.yaw) * Math.cos(this.pitch);
      const orbitY = Math.sin(this.pitch);
      const orbitZ = Math.cos(this.yaw) * Math.cos(this.pitch);
      const eye = [
        this.center[0] + orbitX * this.distance,
        this.center[1] + this.radius * 0.22 + orbitY * this.distance,
        this.center[2] + orbitZ * this.distance,
      ];
      const target = [this.center[0], this.center[1] + this.radius * 0.04, this.center[2]];
      const projection = perspective(Math.PI / 4.6, width / height, this.radius * 0.01, this.radius * 8);
      const view = lookAt(eye, target, [0, 1, 0]);
      const mvp = multiply(projection, view);
      const glassAlpha = GLASS_ALPHA_BY_VLT[this.vlt] ?? 0.5;

      gl.uniformMatrix4fv(this.locations.mvp, false, new Float32Array(mvp));
      gl.uniform3f(this.locations.light, -0.22, 0.86, 0.42);
      this.drawMeshes(false, glassAlpha);
      this.drawMeshes(true, glassAlpha);

      if (!this.dragging) this.yaw += 0.0018;
      window.requestAnimationFrame(() => this.draw());
    }

    drawMeshes(glassPass, glassAlpha) {
      const gl = this.gl;
      if (glassPass) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
      } else {
        gl.disable(gl.BLEND);
        gl.depthMask(true);
      }

      this.meshes.forEach((mesh) => {
        if (!mesh.renderable) return;
        if (mesh.material.isGlass !== glassPass) return;
        const glassColor = GLASS_COLOR_BY_VLT[this.vlt] || GLASS_COLOR_BY_VLT[30];
        const glassMix = GLASS_LIGHT_MIX_BY_VLT[this.vlt] ?? GLASS_LIGHT_MIX_BY_VLT[30];
        const color = mesh.material.isGlass
          ? [glassColor[0], glassColor[1], glassColor[2], glassAlpha]
          : mesh.material.color;
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
        gl.enableVertexAttribArray(this.locations.position);
        gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(this.locations.normal);
        gl.vertexAttribPointer(this.locations.normal, 3, gl.FLOAT, false, 24, 12);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.uniform4f(this.locations.color, color[0], color[1], color[2], color[3] ?? 1);
        gl.uniform1f(this.locations.glass, mesh.material.isGlass ? 1 : 0);
        gl.uniform1f(this.locations.paint, mesh.material.isPaint ? 1 : 0);
        gl.uniform1f(this.locations.glassMix, mesh.material.isGlass ? glassMix : 0.22);
        gl.drawElements(gl.TRIANGLES, mesh.indices.length, mesh.indexType, 0);
      });

      gl.depthMask(true);
    }
  }

  window.PolarGlbViewer = PolarGlbViewer;
})();
