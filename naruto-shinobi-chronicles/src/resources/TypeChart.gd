class_name TypeChart
extends Resource
## Affinity effectiveness matrix. Loaded from data/types/type_chart.json.
## multiplier() is multiplicative across the defender's (up to 2) affinities,
## matching spec section 4 exactly.

var _matrix: Dictionary = {}   # {atk_nature: {def_nature: float}}
var natures: Array = []


static func from_dict(d: Dictionary) -> TypeChart:
	var t := TypeChart.new()
	t.natures = d.get("natures", [])
	t._matrix = d.get("matrix", {})
	return t


func single_multiplier(atk: String, def: String) -> float:
	if not _matrix.has(atk):
		return 1.0
	return float(_matrix[atk].get(def, 1.0))


## Defender affinities multiply together (dual types hit both weaknesses).
func multiplier(atk_nature: String, defender_affinities: Array) -> float:
	var mult := 1.0
	for def_nature in defender_affinities:
		mult *= single_multiplier(atk_nature, def_nature)
	return mult


func label(mult: float) -> String:
	if mult == 0.0:
		return "No effect"
	if mult >= 2.0:
		return "Super effective!"
	if mult < 1.0:
		return "Not very effective..."
	return ""
