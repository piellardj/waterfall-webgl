# waterfall-webgl
A WebGL waterfall simulation from a simple particles system.

Live version [here](https://piellardj.github.io/waterfall-webgl/).

Port of an old OpenGL project: [particles-gpu](https://github.com/piellardj/particles-gpu).

Original idea from [Chris Wellons](http://nullprogram.com/blog/2014/06/29/).


For this project I didn't want to use WebGL extensions, so some things are a bit clumsy.
For instance, since in "core" WebGL one can not bind multiple draw targets, the particles are updated in 2 steps: first the velocities then the positions. This could be done at once with the appropriate extension.


This is my first WebGL project but also my first time using Javascript, so there are probably lots of mistakes.
