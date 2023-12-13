#version 330 core
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

out vec4 FragColor;
//some helper dunctions and bokeh pulled from shadertoy
#define SS(x, y, z) smoothstep(x, y, z)
#define sat(x) clamp(x,0.,1.)

vec3 ro, rd;

vec3 N31(float p) {
   vec3 p3 = fract(vec3(p) * vec3(.2031,.12541,.5098));
   p3 += dot(p3, p3.xzy + 19.19);
   return fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}
float N2(vec2 p)
{
	vec3 p3  = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

float Remap(float a, float b, float c, float d, float t) {
	return ((t-a)/(b-a))*(d-c)+c;
}

float BokehMask(vec3 ro, vec3 rd, vec3 p, float size, float blur) {
	float d = length(cross(p-ro, rd));
    float m = SS(size, size*(1.-blur), d);
    
    m *= mix(.7, 1., SS(.8*size, size, d));

    
    return m;
}

void CameraSetup(vec2 uv, vec3 pos, vec3 lookat, float zoom, float m) {
	ro = pos;
    vec3 f = normalize(lookat-ro);
    vec3 r = cross(vec3(0., 1., 0.), f);
    vec3 u = cross(f, r);
    float t = iTime;
    
    vec2 offs = vec2(0.);


    float x = (sin(t*.1)*.5+.5)*.5;
    x = -x*x;
    float s = sin(x);
    float c = cos(x);
    
    mat2 rot = mat2(c, -s, s, c);


    float ripple = sin(t+uv.y*3.1415*30.+uv.x*124.)*.5+.5;
    ripple *= .005;
    offs += vec2(ripple*ripple, ripple);

    vec3 center = ro + f*zoom;
    vec3 i = center + (uv.x-offs.x)*r + (uv.y-offs.y)*u;
    
    rd = normalize(i-ro);
}

vec3 HeadLights(float i, float t) {
    float z = fract(-t*2.+i);
    vec3 p = vec3(-.3, .1, z*40.);
    float d = length(p-ro);
    
    float size = mix(.03, .05, SS(.02, .07, z))*d;
    float m = 0.;
    float blur = .1;
    m += BokehMask(ro, rd, p-vec3(.08, 0., 0.), size, blur);
    m += BokehMask(ro, rd, p+vec3(.08, 0., 0.), size, blur);
    
    m += BokehMask(ro, rd, p+vec3(.1, 0., 0.), size, blur);
    m += BokehMask(ro, rd, p-vec3(.1, 0., 0.), size, blur);
    
    float distFade = max(.01, pow(1.-z, 9.));
    
    blur = .8;
    size *= 2.5;
    float r = 0.;
    r += BokehMask(ro, rd, p+vec3(-.09, -.2, 0.), size, blur);
    r += BokehMask(ro, rd, p+vec3(.09, -.2, 0.), size, blur);
    r *= distFade*distFade;
    
    return vec3(.8, .8, 1.)*(m+r)*distFade;
}


vec3 TailLights(float i, float t) {
    t = t*1.5+i;
    
    float id = floor(t)+i;
    vec3 n = N31(id);
    
    float laneId = SS(.5, .51, n.y);
    
    float ft = fract(t);
    float z = 3.-ft*3.;	

    laneId *= SS(.2, 1.5, z);			
    float lane = mix(.6, .3, laneId);
    vec3 p = vec3(lane, .1, z);
    float d = length(p-ro);
    
    float size = .05*d;
    float blur = .1;
    float m = BokehMask(ro, rd, p-vec3(.08, 0., 0.), size, blur) +
    			BokehMask(ro, rd, p+vec3(.08, 0., 0.), size, blur);
    
    float bs = n.z*3.;						
    float brake = SS(bs, bs+.01, z);
    brake *= SS(bs+.01, bs, z-.5*n.y);	
    
    m += (BokehMask(ro, rd, p+vec3(.1, 0., 0.), size, blur) +
    	BokehMask(ro, rd, p-vec3(.1, 0., 0.), size, blur))*brake;
    
    float refSize = size*2.5;
    m += BokehMask(ro, rd, p+vec3(-.09, -.2, 0.), refSize, .8);
    m += BokehMask(ro, rd, p+vec3(.09, -.2, 0.), refSize, .8);
    vec3 col = vec3(1., .1, .1)*m*ft; 
    
    float b = BokehMask(ro, rd, p+vec3(.12, 0., 0.), size, blur);
    b += BokehMask(ro, rd, p+vec3(.12, -.2, 0.), refSize, .8)*.2;
    
    vec3 blinker = vec3(1., .7, .2);
    blinker *= SS(1.5, 1.4, z)*SS(.2, .3, z);
    blinker *= sat(sin(t*200.)*100.);
    blinker *= laneId;
    col += blinker*b;
    
    return col;
}

vec3 StreetLights(float i, float t) {
	 float side = sign(rd.x);
    float offset = max(side, 0.)*(1./16.);
    float z = fract(i-t+offset); 
    vec3 p = vec3(2.*side, 2., z*60.);
    float d = length(p-ro);
	float blur = .1;
    vec3 rp = ro + max(0., dot(p-ro, rd))*rd;
    float distFade = Remap(1., .7, .1, 1.5, 1.-pow(1.-z,6.));
    distFade *= (1.-z);
    float m = BokehMask(ro, rd, p, .05*d, blur)*distFade;
    
    return m*vec3(1., .7, .3);
}

vec3 EnvironmentLights(float i, float t) {
	float n = fract(sin((i+floor(t))*202169.34)*704923.249);
    
    float side = sign(rd.x);

    float offset = max(side, 0.)*(1./16.);

    float z = fract(i-t+offset+fract(n*234.));
    float n2 = fract(n*100.);
    vec3 p = vec3((3.+n)*side, n2*n2*n2*1., z*60.);
    float d = length(p-ro);
	float blur = .1;
    vec3 rp = ro + max(0., dot(p-ro, rd))*rd;
    float distFade = Remap(1., .7, .1, 1.5, 1.-pow(1.-z,6.));
    float m = BokehMask(ro, rd, p, .05*d, blur) * distFade*distFade*.5 * (1.-pow(sin(z*6.28*20.*n)*.5+.5, 20.));
    vec3 randomCol = vec3(fract(n*-34.5), fract(n*4572.), fract(n*1264.));
    vec3 col = mix(vec3(1., .1, .1), vec3(1., .7, .3), fract(n*-65.42));
    col = mix(col, randomCol, n);
    return m*col*.2;
}

void main()
{
	float t = iTime;
    vec3 col = vec3(0.);
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    
    uv -= .5;
    uv.x *= iResolution.x/iResolution.y;
    
    vec2 mouse = iMouse.xy/iResolution.xy;
    
    vec3 pos = vec3(.3, .15, 0.);

    float lookatY = pos.y;
    vec3 lookat = vec3(0.3, lookatY, 1.);
    vec3 lookat2 = vec3(0., lookatY, .7);
    lookat = mix(lookat, lookat2,-mouse.x);
    
    CameraSetup(uv, pos, lookat, 2., mouse.x);
   
    t *= .03;
    
    for(float i=0.; i<8.; i++) {
       col += StreetLights(i, t);
       float n = fract(sin((i+floor(t))*202169.34)*704923.249);
       col += HeadLights(i+n*(.1/.8)*.7, t);
    }

    for(float i=0.; i<32; i++) {
       col += EnvironmentLights(i, t);
    }
    
    col += TailLights(0., t) + TailLights(.5, t) + sat(rd.y)*vec3(.6, .5, .9);
    
	FragColor = vec4(col, 0.);
}