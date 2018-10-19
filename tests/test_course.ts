import { Course, Semester } from '..';

import { do_editable_fields_test, global_setup, make_superuser,
         reset_db, run_in_django_shell, sleep } from './utils';

beforeAll(() => {
    global_setup();
});

describe('Course ctor tests', () => {
    test('Construct course', async () => {
        let now = (new Date()).toISOString();
        let course = new Course({
            pk: 44,
            name: 'New Course',
            semester: Semester.summer,
            year: 2017,
            subtitle: 'FUN!',
            num_late_days: 2,
            last_modified: now
        });
        expect(course.pk).toEqual(44);
        expect(course.name).toEqual('New Course');
        expect(course.semester).toEqual(Semester.summer);
        expect(course.year).toEqual(2017);
        expect(course.subtitle).toEqual('FUN!');
        expect(course.num_late_days).toEqual(2);
        expect(course.last_modified).toEqual(now);
    });
});

describe('Get Course tests', () => {
    beforeEach(() => {
        reset_db();
    });

    test('Get course by fields', async () => {
        let create_course = `
from autograder.core.models import Course, Semester
Course.objects.validate_and_create(name='Course', semester=Semester.spring, year=2019,
                                   subtitle='Spam', num_late_days=2)
        `;
        run_in_django_shell(create_course);

        let course = await Course.get_by_fields('Course', Semester.spring, 2019);
        expect(course.name).toEqual('Course');
        expect(course.semester).toEqual(Semester.spring);
        expect(course.year).toEqual(2019);
        expect(course.subtitle).toEqual('Spam');
        expect(course.num_late_days).toEqual(2);
    });

    test('get course by fields not found', async () => {
        return expect(
            Course.get_by_fields('Nope', Semester.fall, 2020)
        ).rejects.toHaveProperty('response.status', 404);
    });

    test('Get course by pk', async () => {
        let create_course = `
from autograder.core.models import Course, Semester
Course.objects.validate_and_create(name='EECS 280', semester=Semester.summer, year=2021,
                                   subtitle='Egg', num_late_days=1)
        `;
        run_in_django_shell(create_course);

        let course = await Course.get_by_fields('EECS 280', Semester.summer, 2021);
        expect(course.name).toEqual('EECS 280');
        expect(course.semester).toEqual(Semester.summer);
        expect(course.year).toEqual(2021);
        expect(course.subtitle).toEqual('Egg');
        expect(course.num_late_days).toEqual(1);
    });

    test('Get course by pk not found', async () => {
        return expect(
            Course.get_by_pk(9000)
        ).rejects.toHaveProperty('response.status', 404);
    });
});

describe('List/create/save Course tests', () => {
    beforeEach(() => {
        reset_db();
        let make_superuser_cmd = `
from django.contrib.auth.models import User

user = User.objects.get_or_create(username='jameslp@umich.edu')[0]
user.is_superuser = True
user.save()
        `;

        run_in_django_shell(make_superuser_cmd);
    });

    test('Get all courses', async () => {
        let create_courses = `
from autograder.core.models import Course, Semester

for i in range(3):
    Course.objects.validate_and_create(name=f'EECS 28{i}', semester=Semester.fall, year=2019,
                                       subtitle=f'Subtitle{i}', num_late_days=i)
        `;
        run_in_django_shell(create_courses);

        let courses = await Course.get_all();
        expect(courses.length).toEqual(3);

        expect(courses[0].name).toEqual('EECS 280');
        expect(courses[0].semester).toEqual(Semester.fall);
        expect(courses[0].year).toEqual(2019);
        expect(courses[0].subtitle).toEqual('Subtitle0');
        expect(courses[0].num_late_days).toEqual(0);

        expect(courses[1].name).toEqual('EECS 281');
        expect(courses[1].semester).toEqual(Semester.fall);
        expect(courses[1].year).toEqual(2019);
        expect(courses[1].subtitle).toEqual('Subtitle1');
        expect(courses[1].num_late_days).toEqual(1);

        expect(courses[2].name).toEqual('EECS 282');
        expect(courses[2].semester).toEqual(Semester.fall);
        expect(courses[2].year).toEqual(2019);
        expect(courses[2].subtitle).toEqual('Subtitle2');
        expect(courses[2].num_late_days).toEqual(2);
    });

    test('Get all courses none exist', async () => {
        let courses = await Course.get_all();
        expect(courses).toEqual([]);
    });

    test('Create course all params', async () => {
        let course = await Course.create({
                name: 'EECS 490',
                semester: Semester.winter,
                year: 2018,
                subtitle: 'PL',
                num_late_days: 1
        });

        expect(course.name).toEqual('EECS 490');
        expect(course.semester).toEqual(Semester.winter);
        expect(course.year).toEqual(2018);
        expect(course.subtitle).toEqual('PL');
        expect(course.num_late_days).toEqual(1);

        let loaded_course = await Course.get_by_pk(course.pk);
        expect(loaded_course.name).toEqual(course.name);
    });

    test('Create course only required params', async () => {
        let course = await Course.create({
            name: 'EECS 481'
        });

        expect(course.name).toEqual('EECS 481');
        expect(course.semester).toEqual(null);
        expect(course.year).toEqual(null);
        expect(course.subtitle).toEqual('');
        expect(course.num_late_days).toEqual(0);

        let loaded_course = await Course.get_by_pk(course.pk);
        expect(loaded_course.name).toEqual(course.name);
    });

    test('Save course', async () => {
        let course = await Course.create({
            name: 'EECS 481'
        });

        let add_as_admin = `
from django.contrib.auth.models import User
from autograder.core.models import Course

user = User.objects.get(username='jameslp@umich.edu')
course = Course.objects.get(pk=${course.pk})
course.admins.add(user)
        `;
        run_in_django_shell(add_as_admin);

        course.name = 'EECS 9001';
        course.semester = Semester.summer;
        course.year = 2022;
        course.subtitle = '20x6';
        course.num_late_days = 1;

        let old_timestamp = course.last_modified;
        await sleep(1);
        await course.save();

        expect(course.name).toEqual('EECS 9001');
        expect(course.semester).toEqual(Semester.summer);
        expect(course.year).toEqual(2022);
        expect(course.subtitle).toEqual('20x6');
        expect(course.num_late_days).toEqual(1);

        expect(course.last_modified).not.toEqual(old_timestamp);

        let loaded_course = await Course.get_by_pk(course.pk);
        expect(loaded_course.name).toEqual('EECS 9001');
        expect(loaded_course.semester).toEqual(Semester.summer);
        expect(loaded_course.year).toEqual(2022);
        expect(loaded_course.subtitle).toEqual('20x6');
        expect(loaded_course.num_late_days).toEqual(1);

        expect(loaded_course.last_modified).not.toEqual(old_timestamp);
    });

    test('Check editable fields', async () => {
        do_editable_fields_test(Course, 'Course');
    });

    test('Refresh course', async () => {
        let course = await Course.create({
            name: 'EECS 480'
        });

        expect(course.name).toEqual('EECS 480');
        expect(course.semester).toEqual(null);
        expect(course.year).toEqual(null);
        expect(course.subtitle).toEqual('');
        expect(course.num_late_days).toEqual(0);

        let old_timestamp = course.last_modified;
        await sleep(1);

        let change_fields = `
from autograder.core.models import Course, Semester
course = Course.objects.get(pk=${course.pk})
course.name = 'EECS 494'
course.semester = Semester.winter
course.year = 2022
course.subtitle = 'Video Gormes'
course.num_late_days = 3
course.save()
        `;
        run_in_django_shell(change_fields);

        await course.refresh();

        expect(course.name).toEqual('EECS 494');
        expect(course.semester).toEqual(Semester.winter);
        expect(course.year).toEqual(2022);
        expect(course.subtitle).toEqual('Video Gormes');
        expect(course.num_late_days).toEqual(3);

        expect(course.last_modified).not.toEqual(old_timestamp);
    });
});

// ----------------------------------------------------------------------------

describe('Course admins tests', () => {
    let course: Course;

    beforeEach(async () => {
        reset_db();
        make_superuser();
        course = await Course.create({name: 'course'});
    });

    test('List admins', async () => {
        let create_users = `
from django.contrib.auth.models import User
from autograder.core.models import Course

User.objects.bulk_create([
    User(username='admin1'),
    User(username='admin2'),
    User(username='admin3'),
])

course = Course.objects.get(pk=${course.pk})
course.admins.add(*User.objects.all())
        `;

        run_in_django_shell(create_users);

        let users = await course.get_admins();
        expect(users.length).toEqual(4);
        let usernames = users.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['admin1', 'admin2', 'admin3', 'jameslp@umich.edu']);
    });

    test('Add admins', async () => {
        await course.add_admins(['new_admin1', 'new_admin2']);
        let admins = await course.get_admins();
        expect(admins.length).toEqual(3);
        let usernames = admins.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['jameslp@umich.edu', 'new_admin1', 'new_admin2']);
    });

    test('Remove admins', async () => {
        await course.add_admins(['admin1', 'admin2', 'admin3']);
        let admins = await course.get_admins();
        let to_remove = admins.filter(
            user => user.username === 'admin1' || user.username === 'admin3');
        await course.remove_admins(to_remove);

        admins = await course.get_admins();
        expect(admins.length).toEqual(2);
        let usernames = admins.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['admin2', 'jameslp@umich.edu']);
    });
});

// ----------------------------------------------------------------------------

describe('Course staff tests', () => {
    let course: Course;

    beforeEach(async () => {
        reset_db();
        make_superuser();
        course = await Course.create({name: 'course'});
    });

    test('List staff', async () => {
        let create_users = `
from django.contrib.auth.models import User
from autograder.core.models import Course

User.objects.bulk_create([
    User(username='staff1'),
    User(username='staff2'),
    User(username='staff3'),
])

course = Course.objects.get(pk=${course.pk})
course.staff.add(*User.objects.exclude(username='jameslp@umich.edu'))
        `;

        run_in_django_shell(create_users);

        let users = await course.get_staff();
        expect(users.length).toEqual(3);
        let usernames = users.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['staff1', 'staff2', 'staff3']);
    });

    test('Add staff', async () => {
        await course.add_staff(['new_staff1', 'new_staff2']);
        let staff = await course.get_staff();
        expect(staff.length).toEqual(2);
        let usernames = staff.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['new_staff1', 'new_staff2']);
    });

    test('Remove staff', async () => {
        await course.add_staff(['staff1', 'staff2', 'staff3']);
        let staff = await course.get_staff();
        let to_remove = staff.filter(
            user => user.username === 'staff2' || user.username === 'staff3');
        await course.remove_staff(to_remove);

        staff = await course.get_staff();
        expect(staff.length).toEqual(1);
        let usernames = staff.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['staff1']);
    });
});

// ----------------------------------------------------------------------------

describe('Course students tests', () => {
    let course: Course;

    beforeEach(async () => {
        reset_db();
        make_superuser();
        course = await Course.create({name: 'course'});
    });

    test('List students', async () => {
        let create_users = `
from django.contrib.auth.models import User
from autograder.core.models import Course

User.objects.bulk_create([
    User(username='student1'),
    User(username='student2'),
    User(username='student3'),
])

course = Course.objects.get(pk=${course.pk})
course.students.add(*User.objects.exclude(username='jameslp@umich.edu'))
        `;

        run_in_django_shell(create_users);

        let users = await course.get_students();
        expect(users.length).toEqual(3);
        let usernames = users.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['student1', 'student2', 'student3']);
    });

    test('Add students', async () => {
        await course.add_students(['new_student1', 'new_student2']);
        let students = await course.get_students();
        expect(students.length).toEqual(2);
        let usernames = students.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['new_student1', 'new_student2']);
    });

    test('Remove students', async () => {
        await course.add_students(['student1', 'student2', 'student3']);
        let students = await course.get_students();
        let to_remove = students.filter(
            user => user.username === 'student1' || user.username === 'student3');
        await course.remove_students(to_remove);

        students = await course.get_students();
        expect(students.length).toEqual(1);
        let usernames = students.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['student2']);
    });

    test('Set student list', async () => {
        await course.add_students(['student1', 'student2', 'student3']);
        let students = await course.get_students();
        expect(students.length).toEqual(3);

        await course.set_students(['student3', 'student4']);
        students = await course.get_students();

        let usernames = students.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['student3', 'student4']);
    });
});

// ----------------------------------------------------------------------------

describe('Course handgraders tests', () => {
    let course: Course;

    beforeEach(async () => {
        reset_db();
        make_superuser();
        course = await Course.create({name: 'course'});
    });

    test('List handgraders', async () => {
        let create_users = `
from django.contrib.auth.models import User
from autograder.core.models import Course

User.objects.bulk_create([
    User(username='handgrader1'),
    User(username='handgrader2'),
    User(username='handgrader3'),
])

course = Course.objects.get(pk=${course.pk})
course.handgraders.add(*User.objects.exclude(username='jameslp@umich.edu'))
        `;

        run_in_django_shell(create_users);

        let users = await course.get_handgraders();
        expect(users.length).toEqual(3);
        let usernames = users.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['handgrader1', 'handgrader2', 'handgrader3']);
    });

    test('Add handgraders', async () => {
        await course.add_handgraders(['new_handgrader1', 'new_handgrader2']);
        let handgraders = await course.get_handgraders();
        expect(handgraders.length).toEqual(2);
        let usernames = handgraders.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['new_handgrader1', 'new_handgrader2']);
    });

    test('Remove handgraders', async () => {
        await course.add_handgraders(['handgrader1', 'handgrader2', 'handgrader3']);
        let handgraders = await course.get_handgraders();
        let to_remove = handgraders.filter(
            user => user.username === 'handgrader1' || user.username === 'handgrader3');
        await course.remove_handgraders(to_remove);

        handgraders = await course.get_handgraders();
        expect(handgraders.length).toEqual(1);
        let usernames = handgraders.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual(['handgrader2']);
    });
});
