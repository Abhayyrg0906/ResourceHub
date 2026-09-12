/**
 * RESOURCEHUB — M21: CAMPUS LOCATION DIRECTORY & CONTROLLER
 * 
 * Curated list of verified safe campus public exchange zones.
 * Includes category, coordinates (on campus grid), safety ratings, and descriptions.
 */

const CAMPUS_LOCATIONS = [
  {
    id: 'central-library',
    name: 'Central Library Lobby',
    category: 'Library',
    building: 'Main Library Building',
    floor: 'Ground Floor (Entrance Plaza)',
    coordinates: { x: 50, y: 45, lat: 12.9716, lng: 77.5946 },
    safety_level: 'HIGH',
    safety_features: ['24/7 Campus Security Desk', 'High-Definition CCTV', 'Well-Lit Public Area'],
    recommended_hours: '08:00 AM – 10:00 PM',
    description: 'Central campus library main reception and seating foyer. Ideal for book and electronics exchanges.'
  },
  {
    id: 'student-union',
    name: 'Student Union Hub (1st Floor)',
    category: 'Student Center',
    building: 'Student Activity Center',
    floor: '1st Floor Atrium',
    coordinates: { x: 65, y: 55, lat: 12.9720, lng: 77.5950 },
    safety_level: 'HIGH',
    safety_features: ['Active Student Foot Traffic', 'Campus Info Helpdesk', 'Monitored Seating'],
    recommended_hours: '09:00 AM – 09:00 PM',
    description: 'Open lounge area next to the campus help desk. Great for quick handovers between classes.'
  },
  {
    id: 'engineering-block',
    name: 'Engineering Block A Lobby',
    category: 'Academic',
    building: 'Engineering Block A',
    floor: 'Ground Floor Entrance',
    coordinates: { x: 35, y: 35, lat: 12.9712, lng: 77.5938 },
    safety_level: 'HIGH',
    safety_features: ['Faculty Entrance Security', 'CCTV Coverage', 'Spacious Seating'],
    recommended_hours: '08:30 AM – 06:30 PM',
    description: 'Main lobby of Engineering Block A. Convenient for lab kits, calculators, and study notes.'
  },
  {
    id: 'science-complex',
    name: 'Science Complex Atrium',
    category: 'Academic',
    building: 'Science & Research Complex',
    floor: 'Central Ground Atrium',
    coordinates: { x: 40, y: 65, lat: 12.9725, lng: 77.5940 },
    safety_level: 'STANDARD',
    safety_features: ['Department Security Checkpoint', 'Daylight Glass Dome', 'Well-Ventilated Space'],
    recommended_hours: '09:00 AM – 06:00 PM',
    description: 'Wide glass atrium connecting chemistry and physics wings.'
  },
  {
    id: 'campus-cafeteria',
    name: 'Main Campus Cafeteria Entrance',
    category: 'Dining',
    building: 'Dining Commons',
    floor: 'North Entrance Plaza',
    coordinates: { x: 75, y: 40, lat: 12.9718, lng: 77.5960 },
    safety_level: 'HIGH',
    safety_features: ['Crowded Public Setting', 'Staff Presence', 'Outdoor & Indoor Tables'],
    recommended_hours: '08:00 AM – 08:00 PM',
    description: 'Bustling meeting area outside the main dining hall.'
  },
  {
    id: 'innovation-lab',
    name: 'Innovation & Robotics Lab Foyer',
    category: 'Laboratory',
    building: 'Tech Innovation Center',
    floor: '2nd Floor Hallway',
    coordinates: { x: 25, y: 50, lat: 12.9708, lng: 77.5942 },
    safety_level: 'STANDARD',
    safety_features: ['Staff Access Control', 'Lab Technician Presence', 'Component Test Benches'],
    recommended_hours: '10:00 AM – 05:00 PM',
    description: 'Foyer outside the hardware prototyping lab. Perfect for testing electronics and sensors.'
  },
  {
    id: 'sports-complex',
    name: 'Sports Complex Main Gate',
    category: 'Recreation',
    building: 'Athletics & Gymnasium',
    floor: 'Main Gate Kiosk',
    coordinates: { x: 80, y: 70, lat: 12.9730, lng: 77.5955 },
    safety_level: 'STANDARD',
    safety_features: ['Security Guard Kiosk', 'Campus Perimeter Lighting'],
    recommended_hours: '07:00 AM – 07:00 PM',
    description: 'Main entrance gate near the campus track and gym.'
  },
  {
    id: 'north-dorm-plaza',
    name: 'North Commons Outdoor Plaza',
    category: 'Residential Area',
    building: 'North Commons Square',
    floor: 'Open Pavilion',
    coordinates: { x: 60, y: 25, lat: 12.9705, lng: 77.5952 },
    safety_level: 'STANDARD',
    safety_features: ['Open Public Square', 'Night Floodlights', 'Emergency Campus Phone'],
    recommended_hours: '09:00 AM – 08:00 PM',
    description: 'Central outdoor pavilion between North residence halls. Public meeting space.'
  }
];

/**
 * Get all verified safe campus locations
 * GET /api/locations/campus
 */
const getCampusLocations = async (req, res) => {
  try {
    const { category } = req.query;
    let locations = CAMPUS_LOCATIONS;

    if (category && category !== 'All') {
      locations = locations.filter(loc => 
        loc.category.toLowerCase() === category.toLowerCase()
      );
    }

    return res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('[LocationController] Error fetching campus locations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve campus locations.'
    });
  }
};

/**
 * Search campus locations by keyword query
 * GET /api/locations/search?q=library
 */
const searchLocations = async (req, res) => {
  try {
    const query = (req.query.q || '').trim().toLowerCase();

    if (!query) {
      return res.status(200).json({
        success: true,
        count: CAMPUS_LOCATIONS.length,
        data: CAMPUS_LOCATIONS
      });
    }

    const matches = CAMPUS_LOCATIONS.filter(loc => 
      loc.name.toLowerCase().includes(query) ||
      loc.building.toLowerCase().includes(query) ||
      loc.category.toLowerCase().includes(query) ||
      loc.description.toLowerCase().includes(query)
    );

    return res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('[LocationController] Error searching campus locations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search campus locations.'
    });
  }
};

module.exports = {
  CAMPUS_LOCATIONS,
  getCampusLocations,
  searchLocations
};
