#version 330 core
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;
out vec4 FragColor;

#define S smoothstep

const float PI = 3.14159265359; 
vec3 bg;

float sat(float x) { return clamp(x,0.,1.); }
float SIN(float x) { return sin(x)*.5+.5; }
float N3(vec3 p) {
    p  = fract( p*0.3183099+.1 );
	p *= 17.0;
    return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
}

float JellyTentacle(vec3 p, float inTentacleLength, float inAnimSpeed, float off)
{	
	float tentacleScalePos	= clamp(abs(p.y) / inTentacleLength, 0.0, 1.0);
	
	float tentacleMod= pow(tentacleScalePos, 1.5) * PI * 2.0 - (iTime*0.5 + sin((iTime+off*PI)*2.0 + PI*0.1)*0.15) * inAnimSpeed;
	float tentacleModifierX = cos(tentacleMod)*0.4;
	float tentacleModifierY = cos(tentacleMod + 12.02343)*0.4;
	p.x	+= (tentacleScalePos * tentacleModifierX) * 2.0;
	p.z	+= (tentacleScalePos * tentacleModifierY) * 2.0;
	
	float tentacleThickness	= mix(0.15, 0.01, tentacleScalePos);
	
	p.y	= abs(p.y + inTentacleLength*0.5) - inTentacleLength * 0.5;

	float cylinder = max(length(p.xz) - tentacleThickness, p.y);

	return cylinder;
}

vec2 map(vec3 pos) {
    float N = N3(pos);
    float pulse = 0.7 - 0.2* cos(iTime);
    vec4 rnd = sin(vec4(123.8456, 64.146543, 992.12343, 1235.01023) * 1.0);

    float d = length(pos) - 0.8;
    float s = length(pos-vec3(0.0, pulse, 0.0)) - 0.8;
    float h = clamp( 0.5 - 0.5*(s+d)/.02, 0.0, 1.0 );
    d = mix( s, -d, h ) + 0.02*h*(1.0-h);
    pos.y -= 1.0;
    d = min(d, JellyTentacle(pos + vec3(rnd.x, pulse, rnd.y)* 0.2, 6.0+rnd.z*2.0, 1.0+rnd.w*0.5, 0.0));
	d = min(d, JellyTentacle(pos + vec3(rnd.w, pulse, rnd.x)* 0.2, 6.0+rnd.y*2.0, 1.0+rnd.z*0.5, 0.0));
	d = min(d, JellyTentacle(pos + vec3(rnd.y, pulse, rnd.z)* 0.2, 6.0+rnd.w*2.0, 1.0+rnd.x*0.5, 0.0));
    return vec2(d,0.0);
}

vec2 castRay(vec3 ro, vec3 rd) {

    float c = 0.0;
    for(int i = 0; i < 256; i++) {
        vec2 ray = map(ro + rd * c);
        if(ray.x < (0.0001*c)) {
            return vec2(c, ray.y);
        }
        c += ray.x;
    }
    return vec2(-1.0, 0.0);
}

vec3 background(vec3 r) {
	
    float x = atan(r.x, r.z);	
	float y = PI*0.5-acos(r.y);  	
    
    vec3 col = bg*(1.+y);
    
	float t = iTime;	
    
    float a = sin(r.x);
    
    float beam = sat(sin(10.*x+a*y*5.+t));
    beam *= sat(sin(7.*x+a*y*3.5-t));
    
    float beam2 = sat(sin(42.*x+a*y*21.-t));
    beam2 *= sat(sin(34.*x+a*y*17.+t));
    
    beam += beam2;
    col *= 1.+beam*.05;

    return col;
}

vec3 render(vec3 ro, vec3 rd) {
    bg = background(rd);
    vec3 col = vec3(0);
    vec2 contact = castRay(ro, rd);

    float v = map(ro + rd * contact.x).x;
    vec2 e = vec2(0.001, 0.0);
    vec3 nor = normalize(vec3(map(ro + rd * contact.x+e.xyy).x, map(ro + rd * contact.x+e.yxy).x, map(ro + rd * contact.x+e.yyx).x) - v);

    
    if(contact.x == -1.) { col = bg; } 
    else {
        float lam = clamp(dot(nor, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
        vec3 R = reflect(rd, nor);
        float fre = sat(1.+dot(rd, nor));
        float trans = (1.-fre)*.5;
        vec3 ref = background(R);

        if(contact.y == 0.0) {
            vec3 dif = vec3(mix(1., .75, 0.)+smoothstep(.1, .6, .3));
            
            dif *= max(.2, lam);

            col = mix(col, vec3(dif), .25);
            col += fre*ref*sat(dot(vec3(0., 1., 0.), nor)) * 2.0;
        }
    }
    return col;
}

void main() {

    float t = iTime*.08;

    vec2 uv = 2.0 * gl_FragCoord.xy/iResolution.xy - 1.0;
    uv.x *= iResolution.x/iResolution.y;

    vec3 cameraTar = vec3(0.0, 0.0, 0.0);

    bg = mix(vec3(.1, .5, 1.), vec3(.1, .5, .6), SIN(t*7.34));



    vec3 up = normalize(vec3(-3,18,-3));
    vec3 viewDir = normalize(uv.x * vec3(-3.0, 0.0, 3.0) + uv.y * up + 2.0 * vec3(3.0, 1.0, 3.0));

    vec3 col = render(vec3(-3.0, -1.0, -3.0), viewDir);

    vec2 pp_uv = gl_FragCoord.xy/iResolution.xy;
    col *= S(-0.5, 0.5, 0.5 - distance(pp_uv, vec2(0.5, 0.5)));

    FragColor = vec4(col, 1.0);
}