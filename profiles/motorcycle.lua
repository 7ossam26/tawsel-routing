-- =============================================================================
-- Motorcycle profile for OSRM
-- Based on the official car.lua (api_version 4), motorcycle-specific changes:
--   - access_tags_hierarchy prioritizes 'motorcycle' over 'motorcar'
--   - restrictions use 'motorcycle' first
--   - Higher open-road speeds (motorway=110, trunk=100, primary=80)
--   - Smaller vehicle dimensions (height=1.5m, width=0.9m, length=2.4m)
--   - vehicle_max_speed = 130 km/h
-- =============================================================================

-- Car profile

api_version = 4

Set = require('lib/set')
Sequence = require('lib/sequence')
Handlers = require("lib/way_handlers")
Relations = require("lib/relations")
Obstacles = require("lib/obstacles")
find_access_tag = require("lib/access").find_access_tag
resolve_access = require("lib/access").resolve_access
limit = require("lib/maxspeed").limit
Utils = require("lib/utils")
Measure = require("lib/measure")

function setup()
  return {
    properties = {
      max_speed_for_map_matching      = 130/3.6, -- 130kmph -> m/s
      weight_name                     = 'routability',
      process_call_tagless_node      = false,
      u_turn_penalty                 = 20,
      continue_straight_at_waypoint  = true,
      use_turn_restrictions          = true,
      left_hand_driving              = false,
    },

    default_mode              = mode.driving,
    default_speed             = 10,
    oneway_handling           = true,
    side_road_multiplier      = 0.8,
    turn_penalty              = 7.5,
    speed_reduction           = 0.8,
    turn_bias                 = 1.075,
    cardinal_directions       = false,

    lane_markings_penalty     = 0.75,
    priority_penalty          = 0.7,

    -- Motorcycle dimensions
    vehicle_height = 1.5,  -- meters
    vehicle_width  = 0.9,  -- meters
    vehicle_length = 2.4,  -- meters
    vehicle_weight = 300,  -- kilograms (bike + rider)

    -- Cap all speeds at 130 km/h for motorcycles
    vehicle_max_speed = 130,

    suffix_list = {
      'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'North', 'South', 'West', 'East', 'Nor', 'Sou', 'We', 'Ea'
    },

    barrier_whitelist = Set {
      'cattle_grid',
      'border_control',
      'toll_booth',
      'sally_port',
      'no',
      'entrance',
      'height_restrictor',
      'arch'
    },

    access_tag_whitelist = Set {
      'yes',
      'motorcycle',
      'motorcar',
      'motor_vehicle',
      'vehicle',
      'permissive',
      'designated',
      'hov'
    },

    access_tag_blacklist = Set {
      'no',
      'agricultural',
      'forestry',
      'emergency',
      'psv',
      'taxi',
      'share_taxi',
      'minibus',
      'bus',
      'foot',
      'emergency_vehicle',
      'restricted',
      'military',
      'official',
      'customers',
      'private',
      'delivery',
      'destination',
      'permit',
      'residents'
    },

    service_access_tag_blacklist = Set {
        'private'
    },

    restricted_access_tag_list = Set {
      'private',
      'delivery',
      'destination',
      'customers',
      'permit',
      'residents',
      'unknown',
    },

    -- Motorcycle takes priority over motorcar in the access hierarchy
    access_tags_hierarchy = Sequence {
      'motorcycle',
      'motorcar',
      'motor_vehicle',
      'vehicle',
      'access'
    },

    service_tag_forbidden = Set {
      'emergency_access'
    },

    -- Motorcycle turn restrictions take priority
    restrictions = Sequence {
      'motorcycle',
      'motorcar',
      'motor_vehicle',
      'vehicle'
    },

    classes = Sequence {
        'toll', 'motorway', 'ferry', 'restricted', 'tunnel'
    },

    excludable = Sequence {
        Set {'toll'},
        Set {'motorway'},
        Set {'ferry'}
    },

    avoid = Set {
      'area',
      'reversible',
      'impassable',
      'hov_lanes',
      'steps',
      'construction',
      'proposed'
    },

    -- Motorcycle speed table (km/h) — higher on open roads vs car
    speeds = Sequence {
      highway = {
        motorway        = 110,
        motorway_link   = 65,
        trunk           = 100,
        trunk_link      = 55,
        primary         = 80,
        primary_link    = 40,
        secondary       = 65,
        secondary_link  = 30,
        tertiary        = 50,
        tertiary_link   = 25,
        unclassified    = 35,
        residential     = 30,
        living_street   = 10,
        service         = 20,
        winter_road     = 20,
        ice_road        = 15
      }
    },

    service_penalties = {
      alley             = 0.5,
      parking           = 0.5,
      parking_aisle     = 0.5,
      driveway          = 0.5,
      ["drive-through"] = 0.5,
      ["drive-thru"] = 0.5
    },

    barrier_penalties = {
      gate      = 60,
      lift_gate = 60,
    },

    restricted_highway_whitelist = Set {
      'motorway',
      'motorway_link',
      'trunk',
      'trunk_link',
      'primary',
      'primary_link',
      'secondary',
      'secondary_link',
      'tertiary',
      'tertiary_link',
      'residential',
      'living_street',
      'unclassified',
      'service',
      'winter_road',
      'ice_road'
    },

    construction_whitelist = Set {
      'no',
      'widening',
      'minor',
    },

    route_speeds = {
      ferry = 5,
      shuttle_train = 10
    },

    bridge_speeds = {
      movable = 5
    },

    -- Surface speed limits (motorcycles more sensitive to poor surfaces)
    surface_speeds = {
      asphalt = nil,
      concrete = nil,
      ["concrete:plates"] = nil,
      ["concrete:lanes"] = nil,
      paved = nil,

      cement = 70,
      compacted = 60,
      fine_gravel = 60,

      paving_stones = 50,
      metal = 40,
      bricks = 40,

      grass = 25,
      wood = 25,
      sett = 30,
      grass_paver = 25,
      gravel = 30,
      unpaved = 30,
      ground = 30,
      dirt = 25,
      pebblestone = 30,
      tartan = 40,

      cobblestone = 20,
      clay = 20,

      earth = 15,
      stone = 15,
      rocky = 15,
      sand = 10,

      laterite = 10,

      mud = 5,

      ice  = 10,
      snow = 20
    },

    tracktype_speeds = {
      grade1 =  60,
      grade2 =  35,
      grade3 =  20,
      grade4 =  15,
      grade5 =  10
    },

    smoothness_speeds = {
      intermediate    =  70,
      bad             =  30,
      very_bad        =  15,
      horrible        =   8,
      very_horrible   =   4,
      impassable      =   0
    },

    maxspeed_table_default = {
      urban = 50,
      rural = 90,
      trunk = 110,
      motorway = 130
    },

    maxspeed_table = {
      ["at:rural"] = 100,
      ["at:trunk"] = 100,
      ["ar:urban"] = 40,
      ["ar:rural"] = 110,
      ["be:motorway"] = 120,
      ["be-bru:rural"] = 70,
      ["be-bru:urban"] = 30,
      ["be-vlg:rural"] = 70,
      ["bg:motorway"] = 140,
      ["by:urban"] = 60,
      ["by:motorway"] = 110,
      ["ca-on:rural"] = 80,
      ["ch:rural"] = 80,
      ["ch:trunk"] = 100,
      ["ch:motorway"] = 120,
      ["de:living_street"] = 7,
      ["de:rural"] = 100,
      ["de:motorway"] = 0,
      ["dk:rural"] = 80,
      ["es:trunk"] = 90,
      ["fr:rural"] = 80,
      ["gb:nsl_single"] = (60*1609)/1000,
      ["gb:nsl_dual"] = (70*1609)/1000,
      ["gb:motorway"] = (70*1609)/1000,
      ["lv:living_street"] = 20,
      ["nl:rural"] = 80,
      ["nl:trunk"] = 100,
      ['no:rural'] = 80,
      ['no:motorway'] = 110,
      ['ph:urban'] = 40,
      ['ph:rural'] = 80,
      ['ph:motorway'] = 100,
      ['pl:rural'] = 100,
      ['pl:expressway'] = 120,
      ['pl:motorway'] = 140,
      ["ro:trunk"] = 100,
      ["ru:living_street"] = 20,
      ["ru:urban"] = 60,
      ["ru:motorway"] = 110,
      ["uk:nsl_single"] = (60*1609)/1000,
      ["uk:nsl_dual"] = (70*1609)/1000,
      ["uk:motorway"] = (70*1609)/1000,
      ['za:urban'] = 60,
      ['za:rural'] = 100,
      ["none"] = 140
    },

    relation_types = Sequence {
      "route"
    },

    highway_turn_classification = {
    },

    access_turn_classification = {
    }
  }
end

function process_node(profile, node, result, relations)
  local access = resolve_access(find_access_tag(node, profile.access_tags_hierarchy), profile)
  if access then
    if profile.access_tag_blacklist[access] and not profile.restricted_access_tag_list[access] then
      obstacle_map:add(node, Obstacle.new(obstacle_type.barrier))
    end
  else
    local barrier = node:get_value_by_key("barrier")
    if barrier then
      local restricted_by_height = false
      if barrier == 'height_restrictor' then
         local maxheight = Measure.get_max_height(node:get_value_by_key("maxheight"), node)
         restricted_by_height = maxheight and maxheight < profile.vehicle_height
      end

      local bollard = node:get_value_by_key("bollard")
      local rising_bollard = bollard and "rising" == bollard

      local kerb = node:get_value_by_key("kerb")
      local highway = node:get_value_by_key("highway")
      local flat_kerb = kerb and ("lowered" == kerb or "flush" == kerb)
      local highway_crossing_kerb = barrier == "kerb" and highway and highway == "crossing"

      local sensory = node:get_value_by_key("sensory")
      local audible_fence = barrier == "fence" and sensory and (sensory == "audible" or sensory == "audio")

      local barrier_penalty = profile.barrier_penalties[barrier]

      if not profile.barrier_whitelist[barrier]
                and not rising_bollard
                and not flat_kerb
                and not highway_crossing_kerb
                and not audible_fence
                and not barrier_penalty
                or restricted_by_height then
        obstacle_map:add(node, Obstacle.new(obstacle_type.barrier))
      end

      if barrier_penalty then
        obstacle_map:add(node, Obstacle.new(obstacle_type.gate,
                                            obstacle_direction.both, barrier_penalty, 0))
      end
    end
  end

  Obstacles.process_node(profile, node)
end

function process_way(profile, way, result, relations)
  local data = {
    highway = way:get_value_by_key('highway'),
    bridge = way:get_value_by_key('bridge'),
    route = way:get_value_by_key('route')
  }

  if (not data.highway or data.highway == '') and
  (not data.route or data.route == '')
  then
    return
  end

  handlers = Sequence {
    WayHandlers.default_mode,
    WayHandlers.blocked_ways,
    WayHandlers.avoid_ways,
    WayHandlers.handle_height,
    WayHandlers.handle_width,
    WayHandlers.handle_length,
    WayHandlers.handle_weight,
    WayHandlers.access,
    WayHandlers.oneway,
    WayHandlers.destinations,
    WayHandlers.ferries,
    WayHandlers.movables,
    WayHandlers.service,
    WayHandlers.hov,
    WayHandlers.speed,
    WayHandlers.maxspeed,
    WayHandlers.surface,
    WayHandlers.vehicle_speed_cap,
    WayHandlers.penalties,
    WayHandlers.classes,
    WayHandlers.turn_lanes,
    WayHandlers.classification,
    WayHandlers.roundabouts,
    WayHandlers.startpoint,
    WayHandlers.driving_side,
    WayHandlers.names,
    WayHandlers.weights,
    WayHandlers.way_classification_for_turn
  }

  WayHandlers.run(profile, way, result, data, handlers, relations)

  if profile.cardinal_directions then
      Relations.process_way_refs(way, relations, result)
  end
end

function process_turn(profile, turn)
  local turn_penalty = profile.turn_penalty
  local turn_bias = turn.is_left_hand_driving and 1. / profile.turn_bias or profile.turn_bias

  for _, obs in pairs(obstacle_map:get(turn.from, turn.via)) do
    if obs.type == obstacle_type.stop_minor and not Obstacles.entering_by_minor_road(turn) then
        goto skip
    end
    if turn.number_of_roads == 2
        and obs.type == obstacle_type.stop
        and obs.direction == obstacle_direction.none
        and turn.source_road.distance < 20
        and turn.target_road.distance > 20 then
            goto skip
    end
    turn.duration = turn.duration + obs.duration
    ::skip::
  end

  if turn.number_of_roads > 2 or turn.source_mode ~= turn.target_mode or turn.is_u_turn then
    if turn.angle >= 0 then
      turn.duration = turn.duration + turn_penalty / (1 + math.exp( -((13 / turn_bias) *  turn.angle/180 - 6.5*turn_bias)))
    else
      turn.duration = turn.duration + turn_penalty / (1 + math.exp( -((13 * turn_bias) * -turn.angle/180 - 6.5/turn_bias)))
    end

    if turn.is_u_turn then
      turn.duration = turn.duration + profile.properties.u_turn_penalty
    end
  end

  if profile.properties.weight_name == 'distance' then
     turn.weight = 0
  else
     turn.weight = turn.duration
  end

  if profile.properties.weight_name == 'routability' then
      if not turn.source_restricted and turn.target_restricted then
          turn.weight = constants.max_turn_weight
      end
  end
end

return {
  setup = setup,
  process_way = process_way,
  process_node = process_node,
  process_turn = process_turn
}
