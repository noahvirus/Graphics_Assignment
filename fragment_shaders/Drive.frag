#version 330 core
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

out vec4 FragColor;

#define SS(x, y, z) smoothstep(x, y, z)
#define B(a, b, edge, t) SS(a-edge, a+edge, t)*SS(b+edge, b-edge, t)
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


float distLine(vec3 ro, vec3 rd, vec3 p) {
	return length(cross(p-ro, rd));
}
 
vec3 ClosestPoint(vec3 ro, vec3 rd, vec3 p) {
    return ro + max(0., dot(p-ro, rd))*rd;
}

float Remap(float a, float b, float c, float d, float t) {
	return ((t-a)/(b-a))*(d-c)+c;
}

float BokehMask(vec3 ro, vec3 rd, vec3 p, float size, float blur) {
	float d = distLine(ro, rd, p);
    float m = SS(size, size*(1.-blur), d);
    
    m *= mix(.7, 1., SS(.8*size, size, d));

    
    return m;
}


vec2 GetDrops(vec2 uv, float seed, float m) {
    
    float t = iTime+m*30.;
    vec2 o = vec2(0.);
    
    uv *= vec2(10., 2.5)*2.;
    vec2 id = floor(uv);
    vec3 n = N31(id.x + (id.y+seed)*546.3524);
    vec2 bd = fract(uv);
    
    vec2 uv2 = bd;
    
    bd -= .5;
    
    bd.y*=4.;
    
    bd.x += (n.x-.5)*.6;
    
    t += n.z * 6.28;
    float slide = cos(t+cos(t))+sin(2.*t)*.2+sin(4.*t)*.02;
    
    float ts = 1.5;
    vec2 trailPos = vec2(bd.x*ts, (fract(bd.y*ts*2.-t*2.)-.5)*.5);
    
    bd.y += slide*2.;								// make drops slide down
    
    float dropShape = bd.x*bd.x;
    dropShape *= 0.4*cos(2.*t)+0.08*cos(4.*t) - (1.-sin(t))*sin(t+cos(t));
    bd.y += dropShape;								// change shape of drop when it is falling

    
    float d = length(bd);							// distance to main drop
    
    float trailMask = SS(-.2, .2, bd.y);				// mask out drops that are below the main
    trailMask *= bd.y;								// fade dropsize
    float td = length(trailPos*max(.5, trailMask));	// distance to trail drops
    
    float mainDrop = SS(.2, .1, d);
    float dropTrail = SS(.1, .02, td);
    
    dropTrail *= trailMask;
    o = mix(bd*mainDrop, trailPos, dropTrail);		// mix main drop and drop trail

    
    return o;
}

void CameraSetup(vec2 uv, vec3 pos, vec3 lookat, float zoom, float m) {
	ro = pos;
    vec3 f = normalize(lookat-ro);
    vec3 r = cross(vec3(0., 1., 0.), f);
    vec3 u = cross(f, r);
    float t = iTime;
    
    vec2 offs = vec2(0.);

    vec2 dropUv = uv; 
    

    float x = (sin(t*.1)*.5+.5)*.5;
    x = -x*x;
    float s = sin(x);
    float c = cos(x);
    
    mat2 rot = mat2(c, -s, s, c);
   

    dropUv = uv*rot;
    dropUv.x += -sin(t*.1)*.5;

    
    offs = GetDrops(dropUv, 1., m);
    

    offs += GetDrops(dropUv*1.4, 10., m);

    offs += GetDrops(dropUv*2.4, 25., m);
    //offs += GetDrops(dropUv*3.4, 11.);
    //offs += GetDrops(dropUv*3., 2.);

    
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
    
    float z = 3.-ft*3.;						// distance ahead
    
    laneId *= SS(.2, 1.5, z);				// get out of the way!
    float lane = mix(.6, .3, laneId);
    vec3 p = vec3(lane, .1, z);
    float d = length(p-ro);
    
    float size = .05*d;
    float blur = .1;
    float m = BokehMask(ro, rd, p-vec3(.08, 0., 0.), size, blur) +
    			BokehMask(ro, rd, p+vec3(.08, 0., 0.), size, blur);
    
    float bs = n.z*3.;						// start braking at random distance		
    float brake = SS(bs, bs+.01, z);
    brake *= SS(bs+.01, bs, z-.5*n.y);		// n.y = random brake duration
    
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
    vec3 rp = ClosestPoint(ro, rd, p);
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
    vec3 rp = ClosestPoint(ro, rd, p);
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
    vec2 uv = gl_FragCoord.xy / iResolution.xy; // 0 <> 1
    
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
    
    // fix for GLES devices by MacroMachines
	float stp = 1./8.;
    
    for(float i=0.; i<1.; i+=stp) {
       col += StreetLights(i, t);
    }
    
    for(float i=0.; i<1.; i+=stp) {
        float n = fract(sin((i+floor(t))*202169.34)*704923.249);
    	col += HeadLights(i+n*stp*.7, t);
    }
    
    stp = 1./32.;

    
    for(float i=0.; i<1.; i+=stp) {
       col += EnvironmentLights(i, t);
    }
    
    col += TailLights(0., t) + TailLights(.5, t) + sat(rd.y)*vec3(.6, .5, .9);
    
	FragColor = vec4(col, 0.);
}