let video;
let poseNet;
let pose;
let skeleton;

// Settings are declared here.

WIDTH = 640
HEIGHT = 480
NOSE_SCALE_FACTOR = 2.5
AUDIO_NAME = "alarm_sound.wav"
POSTURE_ANGLE_THRESHOLD = 20

// Do not change! Internals.
ANGLE_SCALED = POSTURE_ANGLE_THRESHOLD / 100;

X1_ORIENTATION_LINE = 0
X2_ORIENTATION_LINE = WIDTH
Y1_ORIENTATION_LINE = HEIGHT / 2
Y2_ORIENTATION_LINE = HEIGHT / 2

const KeypointNames = [
    "nose",
    "leftEye",
    "rightEye",
    "leftEar",
    "rightEar",
    "leftShoulder",
    "rightShoulder",
    "leftElbow",
    "rightElbow",
    "leftWrist",
    "rightWrist",
    "leftHip",
    "rightHip",
    "leftKnee",
    "rightKnee",
    "leftAnkle",
    "rightAnkle"
]

const utility = {
    // Calculate the angle between two lines.
    // Necessary to determine the posture.
    AngleBetweenLinesAtan2: function(x1, x2, y1, y2, x3, x4, y3, y4) {
        const multiplier = 100;
        let a1 = Math.atan2(y1 - y2, x1 - x2);
        let a2 = Math.atan2(y3 - y4, x3 - x4);
        let angle = a1 - a2;
        if      (angle > Math.PI)   { angle -= 2 * Math.PI; }
        else if (angle <= -Math.PI) { angle += 2 * Math.PI; }
        angle *= multiplier
        return angle;
    },
}

const user_actions = {
    Recalibrate: function(e) {
        // 89 -- Y.
        if (e.ctrlKey && e.key === 89) {
            // Should be done soon enough.
        }
    }
}

const pipeline = {
    // Draw the skeleton. Recognizes body in full.
    DrawSkeleton: function(pose) {
        for (let i = 0; i < skeleton.length; i++) {
            const x = skeleton[i][0];
            const y = skeleton[i][1];
            strokeWeight(2);
            stroke('GRAY');
            line(x.position.x,
                 x.position.y,
                 y.position.x,
                 y.position.y);
        }
    },
    DrawDetectionPoints: function(pose) {
        // Draw the eye points. They are crucial for posture detection.
        const rightEye = pose.rightEye;
        const leftEye = pose.leftEye;
        // Draw the nose :^)
        const d = dist(rightEye.x, rightEye.y, leftEye.x, leftEye.y) / NOSE_SCALE_FACTOR;

        // Fill the skeleton points by ellipses to ensure that model works correctly.
        stroke('WHITE')
        fill(255, 0, 0);

        // Fill the central point of the nose.
        ellipse(pose.nose.x, pose.nose.y, d);
        fill(0, 0, 255);

        // Fill the points of wrists.
        ellipse(pose.rightWrist.x, pose.rightWrist.y, 32);
        ellipse(pose.leftWrist.x, pose.leftWrist.y, 32);

        // Denote the other points.
        for (let i = 0; i < pose.keypoints.length; i++) {
            const x = pose.keypoints[i].position.x;
            const y = pose.keypoints[i].position.y;
            fill(0, 255, 0);
            ellipse(x, y, 16, 16);
        }
    },
    DrawOrientationLine: function() {
        // Draw the orientation line.
        stroke('RED')
        line(X1_ORIENTATION_LINE,
             Y1_ORIENTATION_LINE,
             X2_ORIENTATION_LINE,
             Y2_ORIENTATION_LINE);
        // Reset the stroke.
        stroke('WHITE')
    },
    HandleEyeDiscrepancy: function(x1, x2, y1, y2) {

        // If not calibrated, calculate the angle using atan2.
        // It requires individual calibration and now it's planned to be done.
        const orientation_angle = utility.AngleBetweenLinesAtan2(x1, x2, y1, y2, 0, WIDTH, HEIGHT / 2, HEIGHT / 2);

        // Since we have a sign of rotation, determine the direction of original position and draw its corresponding color.
        if      (orientation_angle >=  POSTURE_ANGLE_THRESHOLD) stroke('RED');
        else if (orientation_angle <= -POSTURE_ANGLE_THRESHOLD) stroke('YELLOW');
        else                                                    stroke('WHITE');

        const correct_height_position = this.HandleEyeVerticalPosition(y1, y2);
        if (!correct_height_position) stroke('RED')
        line(x2, y2, x1, y1);

    },
    // The second line (x3, x4); (y3, y4) is comparatively lower on the y-axis than the first one.
    HandleEyeVerticalPosition: function(y1, y2) {
        return y1 <= Y1_ORIENTATION_LINE || y2 <= Y2_ORIENTATION_LINE;
    }
}

function setup() {
    const canvas = createCanvas(WIDTH, HEIGHT);
    video = createCapture(VIDEO);
    video.hide();
    let options = {
        // ResNet50 is the best architecture available at the moment.
        architecture: 'ResNet50',
        // Detection type is for single person.
        detectionType: 'single'
    }
    // Just call the API and we're done. Unless?
    poseNet = ml5.poseNet(video, options, load_callback);
    poseNet.on('pose', got_poses);
}

function got_poses(poses) {
    if (poses.length > 0) {
        pose = poses[0].pose;
        skeleton = poses[0].skeleton;
    }
}

function load_callback() {
    console.log('poseNet ready');
}

function draw(canvas) {
    image(video, 0, 0);
    if (pose) {
        const rightEye = pose.rightEye;
        const leftEye = pose.leftEye;
        // First, we pass the line which connects one eye to the another. It's our beacon.
        // Pass the line to which we're oriented.
        pipeline.DrawSkeleton(pose);
        pipeline.DrawDetectionPoints(pose);
        pipeline.DrawOrientationLine();
        pipeline.HandleEyeDiscrepancy(rightEye.x, leftEye.x, rightEye.y, leftEye.y);
    }
}

function play_sound() {
    const audio = new Audio(AUDIO_NAME);
    audio.play();
}
