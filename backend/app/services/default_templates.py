"""Service to seed default project templates for new users."""
from app import db
from app.models.template import ProjectTemplate, BoardTemplate, ListTemplate


# Default project templates with their boards and lists
DEFAULT_TEMPLATES = [
    {
        'name': 'International Travel',
        'description': 'Plan and organize an international trip with visa, flights, accommodations, and activities.',
        'color_theme': 'blue',
        'boards': [
            {
                'name': 'Trip Planning',
                'description': 'Main planning board for your international adventure',
                'color_theme': 'blue',
                'stages': [
                    {'name': 'Research', 'position': 0, 'color': '#8B5CF6'},
                    {'name': 'To Book', 'position': 1, 'color': '#F59E0B'},
                    {'name': 'Booked', 'position': 2, 'color': '#3B82F6'},
                    {'name': 'Packed', 'position': 3, 'color': '#10B981'},
                ],
                'tasks': [
                    {'title': 'Research visa requirements', 'stage_position': 0, 'color_theme': 'purple'},
                    {'title': 'Check passport validity', 'stage_position': 0, 'color_theme': 'red'},
                    {'title': 'Research best time to visit', 'stage_position': 0, 'color_theme': 'blue'},
                    {'title': 'Book international flights', 'stage_position': 1, 'color_theme': 'amber'},
                    {'title': 'Reserve accommodations', 'stage_position': 1, 'color_theme': 'amber'},
                    {'title': 'Purchase travel insurance', 'stage_position': 1, 'color_theme': 'amber'},
                    {'title': 'Plan daily itinerary', 'stage_position': 1, 'color_theme': 'blue'},
                ]
            }
        ],
        'lists': [
            {
                'name': 'Packing Checklist',
                'color_theme': 'blue',
                'items': [
                    'Passport & copies',
                    'Travel insurance documents',
                    'Credit cards & cash',
                    'Phone charger & adapter',
                    'Medications',
                    'Toiletries',
                    'Weather-appropriate clothing',
                    'Comfortable walking shoes',
                    'Camera',
                    'Travel pillow',
                ]
            },
            {
                'name': 'Pre-Departure Tasks',
                'color_theme': 'amber',
                'items': [
                    'Notify bank of travel dates',
                    'Set up international phone plan',
                    'Download offline maps',
                    'Learn basic local phrases',
                    'Arrange airport transportation',
                    'Stop mail delivery',
                    'Give spare key to neighbor',
                ]
            }
        ]
    },
    {
        'name': 'Domestic Travel',
        'description': 'Organize a domestic trip with transportation, lodging, and activities.',
        'color_theme': 'green',
        'boards': [
            {
                'name': 'Road Trip Planner',
                'description': 'Plan your domestic adventure',
                'color_theme': 'green',
                'stages': [
                    {'name': 'Ideas', 'position': 0, 'color': '#8B5CF6'},
                    {'name': 'Planning', 'position': 1, 'color': '#F59E0B'},
                    {'name': 'Confirmed', 'position': 2, 'color': '#10B981'},
                ],
                'tasks': [
                    {'title': 'Choose destination', 'stage_position': 0, 'color_theme': 'purple'},
                    {'title': 'Set travel dates', 'stage_position': 0, 'color_theme': 'blue'},
                    {'title': 'Book transportation', 'stage_position': 1, 'color_theme': 'amber'},
                    {'title': 'Reserve hotel/Airbnb', 'stage_position': 1, 'color_theme': 'amber'},
                    {'title': 'Research local attractions', 'stage_position': 1, 'color_theme': 'green'},
                    {'title': 'Make restaurant reservations', 'stage_position': 1, 'color_theme': 'pink'},
                ]
            }
        ],
        'lists': [
            {
                'name': 'Packing List',
                'color_theme': 'green',
                'items': [
                    'Driver\'s license & ID',
                    'Phone charger',
                    'Snacks for the road',
                    'Entertainment (books, music)',
                    'Comfortable clothes',
                    'Sunglasses',
                    'First aid kit',
                    'Reusable water bottle',
                ]
            }
        ]
    },
    {
        'name': 'Hosting Party Planning',
        'description': 'Plan and execute a memorable party or gathering at your home.',
        'color_theme': 'pink',
        'boards': [
            {
                'name': 'Party Preparation',
                'description': 'Track all party planning tasks',
                'color_theme': 'pink',
                'stages': [
                    {'name': 'To Plan', 'position': 0, 'color': '#EC4899'},
                    {'name': 'In Progress', 'position': 1, 'color': '#F59E0B'},
                    {'name': 'Ready', 'position': 2, 'color': '#10B981'},
                ],
                'tasks': [
                    {'title': 'Set date and time', 'stage_position': 0, 'color_theme': 'pink'},
                    {'title': 'Create guest list', 'stage_position': 0, 'color_theme': 'purple'},
                    {'title': 'Send invitations', 'stage_position': 1, 'color_theme': 'blue'},
                    {'title': 'Plan menu', 'stage_position': 0, 'color_theme': 'amber'},
                    {'title': 'Buy decorations', 'stage_position': 1, 'color_theme': 'pink'},
                    {'title': 'Prepare playlist', 'stage_position': 1, 'color_theme': 'purple'},
                    {'title': 'Set up seating arrangement', 'stage_position': 1, 'color_theme': 'green'},
                ]
            }
        ],
        'lists': [
            {
                'name': 'Shopping List',
                'color_theme': 'pink',
                'items': [
                    'Appetizers ingredients',
                    'Main course ingredients',
                    'Dessert',
                    'Drinks (alcoholic & non-alcoholic)',
                    'Ice',
                    'Paper plates & napkins',
                    'Decorations',
                    'Party favors',
                ]
            },
            {
                'name': 'Day-Of Checklist',
                'color_theme': 'amber',
                'items': [
                    'Clean the house',
                    'Set up tables and chairs',
                    'Decorate space',
                    'Prepare food',
                    'Set up drink station',
                    'Test music/speakers',
                    'Set out guest towels',
                    'Take out trash',
                ]
            }
        ]
    },
    {
        'name': 'Home Renovation',
        'description': 'Manage a home improvement or renovation project from planning to completion.',
        'color_theme': 'amber',
        'boards': [
            {
                'name': 'Renovation Tracker',
                'description': 'Track renovation progress and tasks',
                'color_theme': 'amber',
                'stages': [
                    {'name': 'Planning', 'position': 0, 'color': '#6B7280'},
                    {'name': 'Purchasing', 'position': 1, 'color': '#F59E0B'},
                    {'name': 'In Progress', 'position': 2, 'color': '#3B82F6'},
                    {'name': 'Completed', 'position': 3, 'color': '#10B981'},
                ],
                'tasks': [
                    {'title': 'Define project scope', 'stage_position': 0, 'color_theme': 'gray'},
                    {'title': 'Set budget', 'stage_position': 0, 'color_theme': 'amber'},
                    {'title': 'Get contractor quotes', 'stage_position': 0, 'color_theme': 'blue'},
                    {'title': 'Choose materials & finishes', 'stage_position': 0, 'color_theme': 'purple'},
                    {'title': 'Order materials', 'stage_position': 1, 'color_theme': 'amber'},
                    {'title': 'Schedule contractors', 'stage_position': 1, 'color_theme': 'blue'},
                    {'title': 'Obtain permits (if needed)', 'stage_position': 1, 'color_theme': 'red'},
                ]
            }
        ],
        'lists': [
            {
                'name': 'Materials Needed',
                'color_theme': 'amber',
                'items': [
                    'Paint & supplies',
                    'Flooring materials',
                    'Hardware & fixtures',
                    'Lighting',
                    'Tools',
                    'Safety equipment',
                ]
            },
            {
                'name': 'Contractor Contacts',
                'color_theme': 'blue',
                'items': [
                    'General contractor',
                    'Electrician',
                    'Plumber',
                    'Painter',
                    'Inspector',
                ]
            }
        ]
    },
    {
        'name': 'Fitness Challenge',
        'description': 'Track your fitness journey with workout plans, nutrition goals, and progress milestones.',
        'color_theme': 'red',
        'boards': [
            {
                'name': 'Workout Plan',
                'description': 'Weekly workout schedule and tracking',
                'color_theme': 'red',
                'stages': [
                    {'name': 'This Week', 'position': 0, 'color': '#EF4444'},
                    {'name': 'In Progress', 'position': 1, 'color': '#F59E0B'},
                    {'name': 'Completed', 'position': 2, 'color': '#10B981'},
                ],
                'tasks': [
                    {'title': 'Set fitness goals', 'stage_position': 0, 'color_theme': 'red'},
                    {'title': 'Monday: Upper body workout', 'stage_position': 0, 'color_theme': 'blue'},
                    {'title': 'Tuesday: Cardio session', 'stage_position': 0, 'color_theme': 'green'},
                    {'title': 'Wednesday: Rest day / stretching', 'stage_position': 0, 'color_theme': 'purple'},
                    {'title': 'Thursday: Lower body workout', 'stage_position': 0, 'color_theme': 'blue'},
                    {'title': 'Friday: HIIT training', 'stage_position': 0, 'color_theme': 'red'},
                    {'title': 'Weekend: Active recovery', 'stage_position': 0, 'color_theme': 'green'},
                ]
            }
        ],
        'lists': [
            {
                'name': 'Healthy Meal Ideas',
                'color_theme': 'green',
                'items': [
                    'Grilled chicken salad',
                    'Overnight oats with berries',
                    'Salmon with vegetables',
                    'Protein smoothie',
                    'Quinoa bowl',
                    'Greek yogurt parfait',
                    'Lean beef stir-fry',
                    'Egg white omelet',
                ]
            },
            {
                'name': 'Progress Milestones',
                'color_theme': 'red',
                'items': [
                    'Week 1: Establish routine',
                    'Week 2: Increase intensity',
                    'Week 4: First progress check',
                    'Week 8: Reassess goals',
                    'Week 12: Major milestone review',
                ]
            },
            {
                'name': 'Gym Bag Essentials',
                'color_theme': 'gray',
                'items': [
                    'Water bottle',
                    'Workout towel',
                    'Headphones',
                    'Resistance bands',
                    'Foam roller',
                    'Change of clothes',
                    'Protein bar',
                ]
            }
        ]
    }
]


def seed_default_templates(user_id):
    """Create default project templates for a new user."""
    for template_def in DEFAULT_TEMPLATES:
        # Create board templates
        board_template_ids = []
        for board_def in template_def.get('boards', []):
            board_template = BoardTemplate(
                owner_id=user_id,
                name=board_def['name'],
                description=board_def.get('description'),
                color_theme=board_def.get('color_theme', 'blue'),
                template_data={
                    'stages': board_def.get('stages', []),
                    'tasks': board_def.get('tasks', [])
                }
            )
            db.session.add(board_template)
            db.session.flush()
            board_template_ids.append(board_template.id)
        
        # Create list templates
        list_template_ids = []
        for list_def in template_def.get('lists', []):
            items = [{'content': item, 'position': idx} for idx, item in enumerate(list_def.get('items', []))]
            list_template = ListTemplate(
                owner_id=user_id,
                name=list_def['name'],
                color_theme=list_def.get('color_theme', 'gray'),
                template_data={'items': items}
            )
            db.session.add(list_template)
            db.session.flush()
            list_template_ids.append(list_template.id)
        
        # Create project template
        project_template = ProjectTemplate(
            owner_id=user_id,
            name=template_def['name'],
            description=template_def.get('description'),
            color_theme=template_def.get('color_theme', 'blue'),
            template_data={
                'board_template_ids': board_template_ids,
                'list_template_ids': list_template_ids
            }
        )
        db.session.add(project_template)
    
    db.session.commit()
