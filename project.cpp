#include "CSCIx229.h"
#include <fstream>
#include <chrono>
#include <string>
#include <iostream>

int mouseX;
int mouseY;

using namespace std;

std::string readFileToString(std::string path){
    std::ifstream inputFile(path);
    std::string fileContents;
    if (!inputFile.is_open()) {
        std::cerr << "Error opening file: " << path << std::endl;
        return "";
    }

    std::string line;
    while (std::getline(inputFile, line)) {
        fileContents += line + "\n";
    }
    inputFile.close();
    return fileContents;
}

std::string vertexShader =  readFileToString("./vertex_shader/vertex.vert");
std::string fragmentShader1 = readFileToString("./fragment_shaders/Fractal.frag");
std::string fragmentShader2 = readFileToString("./fragment_shaders/Drive.frag");
std::string fragmentShader3 = readFileToString("./fragment_shaders/Space.frag");
std::string fragmentShader4 = readFileToString("./fragment_shaders/Gyroid.frag");
std::string fragmentShader5= readFileToString("./fragment_shaders/Jelly.frag");

GLuint compileShaders(std::string shader, GLenum type)
{
 
    const char* shaderCode = shader.c_str();
    GLuint shaderId = glCreateShader(type);
 
    if (shaderId == 0) {
        std::cout << "Error creating shaders";
        return 0;
    }

    glShaderSource(shaderId, 1, &shaderCode, NULL);
    glCompileShader(shaderId);
 
    GLint compileStatus;

    glGetShaderiv(shaderId, GL_COMPILE_STATUS, &compileStatus);
 
    if (!compileStatus) {
        int length;
        glGetShaderiv(shaderId, GL_INFO_LOG_LENGTH, &length);
        char* cMessage = new char[length];
 
        glGetShaderInfoLog(shaderId, length, &length, cMessage);
        std::cout << "Cannot Compile Shader: " << cMessage;
        delete[] cMessage;
        glDeleteShader(shaderId);
        return 0;
    }
 
    return shaderId;
}


GLuint linkProgram(GLuint vertexShaderId, GLuint fragmentShaderId)
{
    GLuint programId = glCreateProgram();
 
    if (programId == 0) {
        std::cout << "Error Creating Shader Program";
        return 0;
    }
 

    glAttachShader(programId, vertexShaderId);
    glAttachShader(programId, fragmentShaderId);
 

    glLinkProgram(programId);
 
    GLint linkStatus;
 

    glGetProgramiv(programId, GL_LINK_STATUS, &linkStatus);
 
    if (!linkStatus) {
        std::cout << "Error Linking program";
        glDetachShader(programId, vertexShaderId);
        glDetachShader(programId, fragmentShaderId);
        glDeleteProgram(programId);
 
        return 0;
    }
 
    return programId;
}

GLuint loadDataInBuffers()
{
    GLfloat vertices[] = {
                           -1, -1, 0,
                           -1, 1, 0,
                           1, 1, 0,
                           1, -1, 0
    };

    GLuint vboId;

    glGenBuffers(1, &vboId);
    glBindBuffer(GL_ARRAY_BUFFER, vboId);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
    glBindBuffer(GL_ARRAY_BUFFER, 0);

    return vboId;
}
GLuint programs[5];
int program_num = 0;
GLuint programId;
void init()
{
    glClearColor(0, 0, 0, 0);

    GLuint vboId = loadDataInBuffers();

    GLuint vShaderId = compileShaders(vertexShader, GL_VERTEX_SHADER);
    GLuint fShaderId1 = compileShaders(fragmentShader1, GL_FRAGMENT_SHADER);
    GLuint fShaderId2 = compileShaders(fragmentShader2, GL_FRAGMENT_SHADER);
    GLuint fShaderId3 = compileShaders(fragmentShader3, GL_FRAGMENT_SHADER);
    GLuint fShaderId4 = compileShaders(fragmentShader4, GL_FRAGMENT_SHADER);
    GLuint fShaderId5 = compileShaders(fragmentShader5, GL_FRAGMENT_SHADER);
    programs[0] = linkProgram(vShaderId, fShaderId1);
    programs[1] = linkProgram(vShaderId, fShaderId2);
    programs[2] = linkProgram(vShaderId, fShaderId3);
    programs[3] = linkProgram(vShaderId, fShaderId4);
    programs[4] = linkProgram(vShaderId, fShaderId5);

    GLuint posAttributePosition = glGetAttribLocation(programs[0], "pos");

    GLuint vaoId;
    glGenVertexArrays(1, &vaoId); 

    glBindVertexArray(vaoId);

    glBindBuffer(GL_ARRAY_BUFFER, vboId);
    glVertexAttribPointer(posAttributePosition, 3, GL_FLOAT, GL_FALSE, 0, 0);

    glEnableVertexAttribArray(posAttributePosition);

    glUseProgram(programs[0]);
}
chrono::time_point<std::chrono::system_clock> start = std::chrono::high_resolution_clock::now();

void display()
{
    glUseProgram(programs[program_num]);
    glClear(GL_COLOR_BUFFER_BIT);
    glUniform1f(glGetUniformLocation(programs[program_num], "iTime"),std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::high_resolution_clock::now()-start).count()/1000.0f);
    glUniform2f(glGetUniformLocation(programs[program_num], "iResolution"), static_cast<float>(glutGet(GLUT_WINDOW_WIDTH)), static_cast<float>(glutGet(GLUT_WINDOW_HEIGHT)));
    glUniform2f(glGetUniformLocation(programs[program_num], "iMouse"), static_cast<float>(mouseX), static_cast<float>(mouseY));
   
    glDrawArrays(GL_TRIANGLE_FAN, 0, 4);

    glutSwapBuffers();
}
void idle(){
    glutPostRedisplay();
}

void mouseMotion(int x, int y) {
    mouseX = x;
    mouseY = y;
}
void handleLeftClick(int button, int state, int x, int y) {
    if (button == GLUT_LEFT_BUTTON && state == GLUT_UP) {
        if(program_num==4){
            program_num=0;

        }else{
            program_num+=1;

        }
    }
}

int main(int argc, char** argv)
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_RGB | GLUT_DOUBLE);
    glutInitWindowSize(500, 500);
    glutInitWindowPosition(100, 50);
    glutCreateWindow("project");
    #ifdef USEGLEW
    if (glewInit()!=GLEW_OK) Fatal("Error initializing GLEW\n");
    #endif
    init();
    glutDisplayFunc(display);
    glutIdleFunc(idle);
    glutMouseFunc(handleLeftClick);
    glutPassiveMotionFunc(mouseMotion);
    glutMainLoop();
    return 0;
}