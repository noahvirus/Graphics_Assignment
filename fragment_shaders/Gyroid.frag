#version 330 core
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;
out vec4 FragColor;

//ray march starting point functions gotten on shader toy
#define MAX_STEPS 100
#define MAX_DIST 100.
#define SURF_DIST .001
#define TAU 6.283185
#define PI 3.141592
#define S smoothstep
#define T iTime

mat2 Rot(float a) {
    float s=sin(a), c=cos(a);
    return mat2(c, -s, s, c);
}

float gyr(vec3 p, float scale, float thick, float off){
    p*=scale;
    return abs((dot(sin(p),cos(p.zxy))-off)/scale-thick);
}
vec3 Trans(vec3 p){
    p.z -= iTime*.2;
    p.y-=.3;
    return p;

}
float GetDist(vec3 p) {
    p = Trans(p);
    float gyroid1 = gyr(p,5.65, .03, 1.3);
    float gyroid2 = gyr(p,9.43, .03, .3);
    float gyroid3 = gyr(p,20.09, .034, .32);
     float gyroid4 = gyr(p,35.67, .03, .3);
    float gyroid5 = gyr(p,60.29, .034, .32);

    gyroid1-= gyroid2*.3;

    gyroid1-= gyroid3*.2;

     gyroid1-= gyroid4*.1;

      gyroid1-= gyroid5*.05;


    return gyroid1*.8;
}

float RayMarch(vec3 ro, vec3 rd) {
	float dO=0.;
    
    for(int i=0; i<MAX_STEPS; i++) {
    	vec3 p = ro + rd*dO;
        float dS = GetDist(p);
        dO += dS;
        if(dO>MAX_DIST || abs(dS)<SURF_DIST) break;
    }
    
    return dO;
}

vec3 GetNormal(vec3 p) {
    vec2 e = vec2(.001, 0);
    vec3 n = GetDist(p) - 
        vec3(GetDist(p-e.xyy), GetDist(p-e.yxy),GetDist(p-e.yyx));
    
    return normalize(n);
}

vec3 GetRayDir(vec2 uv, vec3 p, vec3 l, float z) {
    vec3 
        f = normalize(l-p),
        r = normalize(cross(vec3(0,1,0), f)),
        u = cross(f,r),
        c = f*z,
        i = c + uv.x*r + uv.y*u;
    return normalize(i);
}
vec3 Backdrop(vec3 rd){
    vec3 col =vec3(0,0,0);
    float y = rd.y*.5+.5;
    col+=(1.-y)*vec3(.1,.5,1)*2.;

    return col;
}

void main()
{
    vec2 uv = (gl_FragCoord.xy-.5*iResolution.xy)/iResolution.y;
	vec2 m = iMouse.xy/iResolution.xy;

    vec3 ro = vec3(0, 0, -.2);
    ro.yz *= Rot(-m.y*PI+1.);
    ro.xz *= Rot(-m.x*TAU);
    
    vec3 rd = GetRayDir(uv, ro, vec3(0,0,0), .8);
    vec3 col = vec3(0);
   
    float d = RayMarch(ro, rd);

    if(d<MAX_DIST) {
        vec3 p = ro + rd * d;
        vec3 n = GetNormal(p);
        float t = iTime;
        float dif = (n.y*.5+.5)*.7;
        col += dif*dif*dif;
        //hading between gyroids
        float gyroid2 = gyr(Trans(p),9.43, .03, .3);
        float gyroid3 = gyr(Trans(p),20.09, .034, .32);
        col*=S(-.1,.1,gyroid2);
        col*=S(-.1,.1,gyroid3);

        float width = -.02+S(0.,-.5,n.y)*.06;
        float crack = S(width,-.03,gyroid2) + S(width,-.19,gyroid3); 
        float gyroid4 = gyr(Trans(p)+t*.1,5.09, .034, .0);
        float gyroid5 = gyr(Trans(p)-t*.05,4.09, .034, .0);

        crack*=gyroid4*gyroid5*20.+.2*S(.2,.0,n.y);
        col+= crack*vec3(.1,.5,1)*2;
       
        
    }
    col = mix(col, Backdrop(rd), S(0.,7.,d));
    FragColor = vec4(col,1.0);
}