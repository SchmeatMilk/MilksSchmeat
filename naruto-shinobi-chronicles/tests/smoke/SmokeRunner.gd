extends Node
## End-to-end headless smoke test. Run with:
##   godot --headless res://tests/smoke/SmokeRunner.tscn
## Drives the real game: new game -> overworld -> wild battle -> taijutsu until
## the battle resolves -> back to overworld -> save + load roundtrip.
## Prints SMOKE_OK on success, SMOKE_FAIL otherwise.


func _ready() -> void:
	# Re-parent ourselves to the tree root so we survive scene changes.
	call_deferred("_run")


func _run() -> void:
	var keeper := Node.new()
	keeper.name = "SmokeKeeper"
	keeper.set_script(load("res://tests/smoke/SmokeKeeper.gd"))
	get_tree().root.add_child(keeper)
