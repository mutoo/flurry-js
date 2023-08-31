Flurry-js
=========

This is a javascript port of the flurry screen saver, inspired by https://github.com/calumr/flurry.

I noticed there is already an existing project call [Flurry for WebGL](https://github.com/RoyCurtis/Flurry-WebGL) on GitHub, which is also great for learning.

My project is a simplified version of the original Flurry. It doesn't offer many variants. However, it reveals the mechanics behind the motion by displaying the invisible stars and sparks that drive the particles.

I have also refactored the original OpenGL fixed rendering pipeline using raw WebGL, added camera, and rendered the particles in a different way. In contrast to the original Flurry, which created particles in screen space, my project utilizes world space + camera projection. This makes the model easier to understand, although the particles don't look as good as in the original version.

![Screenshot 1](/screenshots/screenshot_1.png)
![Screenshot 2](/screenshots/screenshot_2.png)
![Screenshot 3](/screenshots/screenshot_3.png)
![Screenshot 4](/screenshots/screenshot_4.png)
![Screenshot 5](/screenshots/screenshot_5.png)
![Screenshot 6](/screenshots/screenshot_6.png)
