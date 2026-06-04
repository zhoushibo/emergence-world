/**
 * 自定义建筑着色器 — 标准 PBR + Fresnel 边缘发光
 * 让建筑在边缘处产生辉光轮廓，类似 UE5 的 Clear Coat 效果
 */
import * as THREE from 'three';

export function createBuildingMaterial(
  baseColor: string,
  neonColor: string,
  roughness = 0.5,
  metalness = 0.3,
  emissiveIntensity = 0.15,
) {
  const base = new THREE.Color(baseColor);
  const neon = new THREE.Color(neonColor);

  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: base },
      uNeonColor: { value: neon },
      uRoughness: { value: roughness },
      uMetalness: { value: metalness },
      uEmissiveIntensity: { value: emissiveIntensity },
      uTime: { value: 0 },
      uCameraPos: { value: new THREE.Vector3() },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      uniform vec3 uNeonColor;
      uniform float uRoughness;
      uniform float uMetalness;
      uniform float uEmissiveIntensity;
      uniform float uTime;
      uniform vec3 uCameraPos;

      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDir);

        // Fresnel 边缘光
        float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
        fresnel = pow(fresnel, 2.5);

        // 基础色
        vec3 color = uBaseColor;

        // 边缘发光
        float rimPulse = 0.7 + 0.3 * sin(uTime * 0.5 + vWorldPos.y * 2.0);
        vec3 rimColor = uNeonColor * fresnel * 0.6 * rimPulse;

        // 简单漫反射 (模拟方向光)
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        float diffuse = max(dot(normal, lightDir), 0.0) * 0.7 + 0.3;

        // 简单高光
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 20.0) * uMetalness * 0.5;

        vec3 finalColor = color * diffuse + vec3(spec) + rimColor;

        // 微弱自发光的脉冲
        float pulse = uEmissiveIntensity * (0.8 + 0.2 * sin(uTime * 0.3 + vWorldPos.x));
        finalColor += uNeonColor * pulse * 0.3;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    // 保持阴影
    side: THREE.DoubleSide,
  });
}
