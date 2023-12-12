#version 330 core
uniform float iTime;
uniform vec2 iResolution;

out vec4 FragColor;

vec3 palette(float t){
    vec3 a = vec3(0.1, 0.3, 0.6);
    vec3 b = vec3(0.7, 0.2, 0.5);
    vec3 c = vec3(1.0, 0.8, 0.4);
    vec3 d = vec3(0.163, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    for (float i = 0.0; i < 5.0; i++) {
        uv = fract(uv * 1.5) - 0.5;

        // Use a different distance calculation
        float distance = length(uv) * exp(-length(uv0) * 0.8);
        vec3 color = palette(length(uv0) + i * 0.4 + iTime * 0.4);

        // Modify the distance and apply to color
        distance = sin(distance * 8.0 + iTime) / 8.0;
        distance = abs(distance);
        distance = pow(0.01 / distance, 1.2);
        color *= fract((distance * 365.0 / 100.0 + 6.0) / iTime);

        finalColor += color * distance;
    }

    FragColor = vec4(finalColor, 1.0) / 4.0;
}