extends Node
## AudioDirector — chiptune-style audio without shipped assets: BGM stubs that
## no-op gracefully when a track file is absent, plus synthesized SFX blips so
## the game has audible feedback before real .it modules land in assets/audio.

var _bgm_player: AudioStreamPlayer
var _sfx_player: AudioStreamPlayer
var current_track: String = ""


func _ready() -> void:
	_bgm_player = AudioStreamPlayer.new()
	_bgm_player.bus = "Master"
	add_child(_bgm_player)
	_sfx_player = AudioStreamPlayer.new()
	_sfx_player.bus = "Master"
	add_child(_sfx_player)


func play_bgm(track: String) -> void:
	if track == current_track:
		return
	current_track = track
	var path := "res://assets/audio/music/%s.ogg" % track
	if ResourceLoader.exists(path):
		_bgm_player.stream = load(path)
		_bgm_player.play()
	else:
		_bgm_player.stop()  # silent until the module is authored


func stop_bgm() -> void:
	current_track = ""
	_bgm_player.stop()


## Synthesized square-wave blip — placeholder SFX in the GBA spirit.
func play_blip(pitch_hz: float = 440.0, duration: float = 0.08) -> void:
	var rate := 22050
	var frames := int(rate * duration)
	var data := PackedByteArray()
	data.resize(frames * 2)
	for i in frames:
		var t := float(i) / rate
		var v := 0.25 if fmod(t * pitch_hz, 1.0) < 0.5 else -0.25
		var s := int(clampf(v * (1.0 - float(i) / frames), -1.0, 1.0) * 32767.0)
		data.encode_s16(i * 2, s)
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = rate
	stream.data = data
	_sfx_player.stream = stream
	_sfx_player.play()


func sfx_confirm() -> void: play_blip(880.0, 0.06)
func sfx_cancel() -> void: play_blip(330.0, 0.06)
func sfx_hit() -> void: play_blip(160.0, 0.1)
func sfx_heal() -> void: play_blip(660.0, 0.12)
