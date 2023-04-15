import * as fse from "fs-extra";
import * as path from "path";
import { Demopage } from "webpage-templates";

const data = {
    title: "Waterfall",
    description: "WebGL waterfall simulation",
    introduction: [
        "This project is a WebGL simulation of a waterfall running entirely on GPU. You can interact with the fluid with the mouse, and add obstacles with the left mouse button.",
        "It is essentially a particle system, with the particles independently falling and bouncing off obstacles. The cartoonish look is achieved by applying a blur and then a threshold to the particles."
    ],
    githubProjectName: "waterfall-webgl",
    readme: {
        filepath: path.join(__dirname, "..", "README.md"),
        branchName: "master"
    },
    additionalLinks: [
        {
            href: "https://piellardj.github.io/waterfall-webgl2",
            text: "WebGL 2 version"
        }
    ],
    scriptFiles: [
        "script/gl-utils.js",
        "script/particles.js",
        "script/obstacle-map.js",
        "script/parameters.js",
        "script/fluidify.js",
        "script/main.js"
    ],
    indicators: [
        {
            id: "fps",
            label: "FPS"
        },
        {
            id: "number-of-particles",
            label: "Number of particles"
        }
    ],
    canvas: {
        width: 512,
        height: 512,
        enableFullscreen: false
    },
    controlsSections: [
        {
            title: "Particles",
            controls: [
                {
                    type: Demopage.supportedControls.Range,
                    title: "Quantity",
                    id: "quantity-range-id",
                    min: 0,
                    max: 9,
                    value: 3,
                    step: 1
                },
                {
                    type: Demopage.supportedControls.Range,
                    title: "Gravity",
                    id: "gravity-range-id",
                    min: 10,
                    max: 300,
                    value: 100,
                    step: 1
                },
                {
                    type: Demopage.supportedControls.Range,
                    title: "Speed",
                    id: "speed-range-id",
                    min: 0.1,
                    max: 1.9,
                    value: 1,
                    step: 0.02
                }
            ]
        },
        {
            title: "Obstacles",
            controls: [
                {
                    type: Demopage.supportedControls.Range,
                    title: "Radius",
                    id: "radius-range-id",
                    min: 10,
                    max: 100,
                    value: 40,
                    step: 1
                },
                {
                    type: Demopage.supportedControls.Checkbox,
                    title: "Show normals",
                    id: "obstacles-normals-checkbox-id",
                    checked: false
                },
                {
                    type: Demopage.supportedControls.Button,
                    id: "clear-button-id",
                    label: "Clear"
                }
            ]
        },
        {
            title: "Rendering",
            controls: [
                {
                    type: Demopage.supportedControls.Tabs,
                    id: "mode",
                    unique: true,
                    options: [
                        {
                            value: "points",
                            label: "Points"
                            
                        },
                        {
                            value: "fluid",
                            label: "Fluid",
                            checked: true
                        }
                    ]
                },
                {
                    type: Demopage.supportedControls.Range,
                    title: "Point size",
                    id: "point-size-range-id",
                    min: 1,
                    max: 20,
                    value: 6,
                    step: 1
                },
                {
                    type: Demopage.supportedControls.Range,
                    title: "Blur",
                    id: "blur-range-id",
                    min: 1,
                    max: 41,
                    value: 21,
                    step: 2
                },
                {
                    type: Demopage.supportedControls.Range,
                    title: "Threshold",
                    id: "threshold-range-id",
                    min: 0,
                    max: 1,
                    value: 0.2,
                    step: 0.01
                },
                {
                    type: Demopage.supportedControls.Checkbox,
                    title: "Show normals",
                    id: "water-normals-checkbox-id",
                    checked: false
                },
                {
                    type: Demopage.supportedControls.Checkbox,
                    title: "Specular",
                    id: "specular-checkbox-id",
                    checked: true
                }
            ]
        }
    ]
};

const SRC_DIR = path.resolve(__dirname);
const DEST_DIR = path.resolve(__dirname, "..", "docs");
const minified = true;

Demopage.build(data, DEST_DIR, {
    debug: !minified,
});

fse.copySync(path.resolve(SRC_DIR, "script"), path.resolve(DEST_DIR, "script"));
