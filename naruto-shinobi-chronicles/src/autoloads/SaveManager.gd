extends Node
## SaveManager — SRAM-style binary saves. 3 manual slots, var_to_bytes blob with
## checksum header. Target footprint well under 32KB per slot.

const SLOT_COUNT := 3
const SAVE_PATH := "user://shinobi_save_%d.sav"
const MAGIC := 0x534E4348  # "SNCH"


func save_slot(slot: int) -> bool:
	if slot < 0 or slot >= SLOT_COUNT:
		return false
	var payload: PackedByteArray = var_to_bytes(get_node("/root/GameState").to_dict())
	var file := FileAccess.open(SAVE_PATH % slot, FileAccess.WRITE)
	if file == null:
		return false
	file.store_32(MAGIC)
	file.store_32(payload.size())
	file.store_32(_checksum(payload))
	file.store_buffer(payload)
	file.close()
	return true


func load_slot(slot: int) -> bool:
	var path := SAVE_PATH % slot
	if not FileAccess.file_exists(path):
		return false
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return false
	if file.get_32() != MAGIC:
		return false
	var size := file.get_32()
	var checksum := file.get_32()
	var payload := file.get_buffer(size)
	file.close()
	if _checksum(payload) != checksum:
		push_error("Save slot %d failed checksum — refusing to load." % slot)
		return false
	var data = bytes_to_var(payload)
	if not data is Dictionary:
		return false
	get_node("/root/GameState").from_dict(data)
	return true


func slot_summary(slot: int) -> Dictionary:
	var path := SAVE_PATH % slot
	if not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null or file.get_32() != MAGIC:
		return {}
	var size := file.get_32()
	file.get_32()
	var data = bytes_to_var(file.get_buffer(size))
	file.close()
	if not data is Dictionary:
		return {}
	return {
		"commander": data.get("commander_name", "?"),
		"party_size": data.get("party", []).size(),
		"map": data.get("current_map", "?"),
	}


func _checksum(bytes: PackedByteArray) -> int:
	var sum := 0
	for b in bytes:
		sum = (sum * 31 + b) & 0x7FFFFFFF
	return sum
