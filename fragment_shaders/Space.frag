#version 330 core
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;
out vec4 FragColor;

float customHash(vec2 p) {
    vec3 a = fract(vec3(p.xyx) * vec3(123.456, 789.012, 345.678));
    a += dot(a, a.yzx + 45.67);
    return fract((a.x + a.y) * a.z);
}

vec2 calculatePosition(vec2 id, vec2 offs, float t) {
    float n = customHash(id + offs);
    float n1 = fract(n * 15.0);
    float n2 = fract(n * 200.0);
    float a = t + n;
    return offs + vec2(sin(a * n1), cos(a * n2)) * 0.3;
}

float distanceToLine(vec2 a, vec2 b, vec2 p) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float lineSegment(vec2 a, vec2 b, vec2 uv) {
    float r1 = 0.04;
    float r2 = 0.01;

    float d = distanceToLine(a, b, uv);
    float d2 = length(a - b);
    float fade = smoothstep(1.5, 0.5, d2) + smoothstep(0.05, 0.02, abs(d2 - 0.75));

    return smoothstep(r1, r2, d) * fade;
}

float customLayer(vec2 st, float n, float t) {
    vec2 id = floor(st) + n;
    st = fract(st) - 0.5;

    vec2 p[9];
    int i = 0;
    for (float y = -1.0; y <= 1.0; y++) {
        for (float x = -1.0; x <= 1.0; x++) {
            p[i++] = calculatePosition(id, vec2(x, y), t);
        }
    }

    float m = 0.0;
    float sparkle = 0.0;

    for (i = 0; i < 9; i++) {
        m += lineSegment(p[4], p[i], st);

        float dist = length(st - p[i]);
        float s = (0.005 / (dist * dist)) * smoothstep(1.0, 0.7, dist);
        float pulse = sin((fract(p[i].x) + fract(p[i].y) + t) * 5.0) * 0.4 + 0.6;
        pulse = pow(pulse, 20.0);
        s *= pulse;
        sparkle += s;
    }

    m += lineSegment(p[1], p[3], st) + lineSegment(p[1], p[5], st) + lineSegment(p[7], p[5], st) + lineSegment(p[7], p[3], st);

    float sPhase = (sin(t + n) + sin(t * 0.1)) * 0.25 + 0.5;
    sPhase += pow(sin(t * 0.1) * 0.5 + 0.5, 50.0) * 5.0;
    m += sparkle * sPhase;

    return m;
}

void main() {
    vec2 myUV = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
    vec2 myMouse = iMouse.xy / iResolution.xy - 0.5;

    float myTime = iTime * 0.1;

    float mySin = sin(myTime);
    float myCos = cos(myTime);
    mat2 myRotation = mat2(myCos, -mySin, mySin, myCos);
    vec2 mySt = myUV * myRotation;
    myMouse *= myRotation * 2.0;

    float myResult = 0.0;
    for (float i = 0.0; i < 1.0; i += 0.1) {
        float z = fract(myTime + i);
        float mySize = mix(20.0, 1.0, z);
        float myFade = smoothstep(0.0, 0.8, z) * smoothstep(1.0, 0.6, z);
        myResult += myFade * customLayer(mySt * mySize - myMouse * z, i, iTime);
    }

    vec3 myBaseCol = vec3(mySin * 0.8, 0.2, 1.0) * 0.5 + 0.5;
    vec3 myCol = myBaseCol * myResult + myBaseCol;

    myCol *= 1.0 - dot(myUV, myUV);
    float myModTime = mod(iTime, 250.0);
    myCol *= smoothstep(0.0, 30.0, myModTime) * smoothstep(244.0, 220.0, myModTime);

    FragColor = vec4(myCol, 1);
}