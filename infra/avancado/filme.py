"""Gera o curta usado pelo estudo de streaming com Blender 5.x."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x, scene.render.resolution_y = 640, 360
scene.render.resolution_percentage = 100
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'OBJECT'
scene.display.shading.background_type = 'WORLD'
scene.world = bpy.data.worlds.new('Papel')
scene.world.color = (0.85, 0.80, 0.71)
bpy.ops.object.camera_add(location=(7, -9, 8))
camera = bpy.context.object
camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 9
scene.camera = camera
for i in range(12):
    angle = i * math.tau / 12
    bpy.ops.mesh.primitive_cube_add(size=1, location=(2.7*math.cos(angle), 2.7*math.sin(angle), 0))
    obj = bpy.context.object
    obj.color = (0.13, 0.32, 0.26, 1) if i % 3 else (0.85, 0.22, 0.07, 1)
    obj.scale = (0.15, 0.58, 0.25)
    obj.rotation_euler.z = angle + math.pi/2
for i, radius in enumerate([1.3, 2.0]):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.33+i*0.09)
    obj = bpy.context.object
    obj.color = (0.84, 0.2, 0.07, 1) if i else (0.13, 0.32, 0.26, 1)
    for frame in range(1, 98, 4):
        angle = frame/96*math.tau*(1 if i else -2)
        obj.location = (radius*math.cos(angle), radius*math.sin(angle), .35)
        obj.keyframe_insert(data_path='location', frame=frame)
scene.frame_end = 96
scene.render.fps = 16
scene.render.image_settings.media_type = 'VIDEO'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.filepath = str(Path(__file__).resolve().parents[2]/'dist'/'avancado'/'orbita.mp4')
bpy.ops.render.render(animation=True)

