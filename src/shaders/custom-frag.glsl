#version 300 es

// This is a fragment shader. If you've opened this file first, please
// open and read lambert.vert.glsl before reading on.
// Unlike the vertex shader, the fragment shader actually does compute
// the shading of geometry. For every pixel in your program's output
// screen, the fragment shader is run for every bit of geometry that
// particular pixel overlaps. By implicitly interpolating the position
// data passed into the fragment shader by the vertex shader, the fragment shader
// can compute what color to apply to its pixel based on things like vertex
// position, light position, and vertex color.
precision highp float;
const float PI = 3.14159265359;

uniform vec4 u_Color; // The color with which to render this instance of geometry.

// These are the interpolated values out of the rasterizer, so you can't know
// their specific values without knowing the vertices that contributed to them
in vec4 fs_Nor;
in vec4 fs_LightVec;
in vec4 fs_Col;

uniform float u_Time;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

vec2 random2(vec2 p){
  return normalize(2.f * fract(sin(vec2(dot(p,vec2(127.1, 311.7)),
                  dot(p, vec2(269.5, 183.3)))) * 43758.5453f) - 1.f);
}

vec3 random3( vec3 p ) {
  return fract(sin(vec3(dot(p,vec3(127.1, 311.7, 191.999)),
                        dot(p,vec3(269.5, 183.3, 765.54)),
                        dot(p, vec3(420.69, 631.2,109.21))))
                 *43758.5453);
}

float surflet(vec2 p, vec2 gridPoint)
{
  // Compute falloff function by converting linear distance to a polynomial (quintic smootherstep function)
  float distX = abs(p.x - gridPoint.x);
  float distY = abs(p.y - gridPoint.y);
  float tX = 1.0 - 6.0 * pow(distX, 5.0) + 15.0 * pow(distX, 4.0) - 10.0 * pow(distX, 3.0);
  float tY = 1.0 - 6.0 * pow(distY, 5.0) + 15.0 * pow(distY, 4.0) - 10.0 * pow(distY, 3.0);

  // Get the random vector for the grid point
   vec2 gradient = vec2(random2(gridPoint));// - vec2(1, 1);
  // Get the vector from the grid point to P
  vec2 diff = p - gridPoint;
  // Get the value of our height field by dotting grid->P with our gradient
  float height = dot(diff, gradient);
  // Scale our height field (i.e. reduce it) by our polynomial falloff function
  return height * tX * tY;
}

float perlinNoise2D(vec2 uv)
{
  vec2 uvFloor = vec2(floor(uv.x), floor(uv.y));
  float surfletSum = 0.f;

  for(int dx = 0; dx <= 1; ++dx)
  {
       for(int dy = 0; dy <= 1; ++dy)
      {
          surfletSum += surflet(uv, uvFloor + vec2(dx, dy));
      }
  }

  return surfletSum;
}

float perlinNoise3D(vec3 v)
{
  float xy = perlinNoise2D(vec2(v.x, v.y));
  float yz = perlinNoise2D(vec2(v.y, v.z));
  float zx = perlinNoise2D(vec2(v.z, v.x));
  float yx = perlinNoise2D(vec2(v.y, v.x));
  float zy = perlinNoise2D(vec2(v.z, v.y));
  float xz = perlinNoise2D(vec2(v.x, v.z));

  return (xy + yz + zx + yx + zy + xz) / 6.0f;
}

float easeInOutSine(float x) {
  return -((cos(PI * x) - 1.f) / 2.f);
}

void main()
{
  // Material base color (before shading)
  float noise = perlinNoise3D(fs_Col.xyz * vec3(1.630, 2.780, 2.050));
  vec3 staticNoise = random3(fs_Col.xyz);

  vec3 diffuseColor = vec3(u_Color.x + noise, u_Color.y + noise, u_Color.z + noise);
  diffuseColor *= mix(diffuseColor, staticNoise, smoothstep(vec3(0.8), vec3(1.2), diffuseColor));

  // Calculate the diffuse term for Lambert shading
  float diffuseTerm = dot(normalize(fs_Nor), normalize(fs_LightVec));
  // Avoid negative lighting values
  // diffuseTerm = clamp(diffuseTerm, 0, 1);

  float ambientTerm = 0.2;

  float lightIntensity = diffuseTerm + ambientTerm;   //Add a small float value to the color multiplier
                                                            //to simulate ambient lighting. This ensures that faces that are not
                                                            //lit by our point light are not completely black.

  // Compute final shaded color
  out_Col = vec4(diffuseColor.rgb * lightIntensity, u_Color.a);
}
