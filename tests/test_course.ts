import { Course, CourseObserver, NewCourseData, Semester, User } from '..';

import {
    do_editable_fields_test, expect_dates_not_equal,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell,
    sleep,
    SUPERUSER_NAME,
} from './utils';

beforeAll(() => {
    global_setup();
});

describe('Course ctor tests', () => {
    test('Construct course', () => {
        let now = (new Date()).toISOString();
        let course = new Course({
            pk: 44,
            name: 'New Course',
            semester: Semester.summer,
            year: 2017,
            subtitle: 'FUN!',
            num_late_days: 2,
            allowed_guest_domain: '',
            last_modified: now
        });
        expect(course.pk).toEqual(44);
        expect(course.name).toEqual('New Course');
        expect(course.semester).toEqual(Semester.summer);
        expect(course.year).toEqual(2017);
        expect(course.subtitle).toEqual('FUN!');
        expect(course.num_late_days).toEqual(2);
        expect(course.allowed_guest_domain).toEqual('');
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
        ).rejects.toHaveProperty('status', 404);
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
        ).rejects.toHaveProperty('status', 404);
    });
});

describe('List/create/save/delete Course tests', () => {
    beforeEach(() => {
        reset_db();
        make_superuser();
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

    test('Get courses for user', async () => {
        let add_permissions = `
from django.contrib.auth.models import User
from autograder.core.models import Course

user = User.objects.first()
admin_course = Course.objects.validate_and_create(name='admin course')
admin_course.admins.add(user)

staff_course = Course.objects.validate_and_create(name='staff course')
staff_course.staff.add(user)

student_course = Course.objects.validate_and_create(name='student course')
student_course.students.add(user)

handgrader_course = Course.objects.validate_and_create(name='handgrader course')
handgrader_course.handgraders.add(user)
        `;
        run_in_django_shell(add_permissions);

        let courses = await Course.get_courses_for_user(await User.get_current());

        expect(courses.courses_is_admin_for.length).toEqual(1);
        expect(courses.courses_is_admin_for[0].name).toEqual('admin course');
        expect(courses.courses_is_staff_for.length).toEqual(1);
        expect(courses.courses_is_staff_for[0].name).toEqual('staff course');
        expect(courses.courses_is_student_in.length).toEqual(1);
        expect(courses.courses_is_student_in[0].name).toEqual('student course');
        expect(courses.courses_is_handgrader_for.length).toEqual(1);
        expect(courses.courses_is_handgrader_for[0].name).toEqual('handgrader course');
    });

    test('Get courses for user no courses exist', async () => {
        let courses = await Course.get_courses_for_user(await User.get_current());

        expect(courses.courses_is_admin_for).toEqual([]);
        expect(courses.courses_is_staff_for).toEqual([]);
        expect(courses.courses_is_student_in).toEqual([]);
        expect(courses.courses_is_handgrader_for).toEqual([]);
    });

    test('Create course all params', async () => {
        let course = await Course.create(new NewCourseData({
            name: 'EECS 490',
            semester: Semester.winter,
            year: 2018,
            subtitle: 'PL',
            num_late_days: 1
        }));

        expect(course.name).toEqual('EECS 490');
        expect(course.semester).toEqual(Semester.winter);
        expect(course.year).toEqual(2018);
        expect(course.subtitle).toEqual('PL');
        expect(course.num_late_days).toEqual(1);

        let loaded_course = await Course.get_by_pk(course.pk);
        expect(loaded_course.name).toEqual(course.name);
    });

    test('Create course only required params', async () => {
        let course = await Course.create(new NewCourseData({
            name: 'EECS 481'
        }));

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

user = User.objects.get(username='${SUPERUSER_NAME}')
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

        expect_dates_not_equal(course.last_modified, old_timestamp);

        let loaded_course = await Course.get_by_pk(course.pk);
        expect(loaded_course.name).toEqual('EECS 9001');
        expect(loaded_course.semester).toEqual(Semester.summer);
        expect(loaded_course.year).toEqual(2022);
        expect(loaded_course.subtitle).toEqual('20x6');
        expect(loaded_course.num_late_days).toEqual(1);

        expect_dates_not_equal(loaded_course.last_modified, old_timestamp);
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

        expect_dates_not_equal(course.last_modified, old_timestamp);
    });

    test('Delete course', async () => {
        let course = await Course.create({name: 'EECS 222'});
        await course.delete();
        await course.refresh();
        expect(course.name).toContain('DELETED');
    });

    test('Copy course', async () => {
        let course = await Course.create({name: 'EECS 480'});
        let new_course = await course.copy('course clone', Semester.winter, 2021);


        expect(new_course.name).toEqual('course clone');
        expect(new_course.semester).toEqual(Semester.winter);
        expect(new_course.year).toEqual(2021);
        expect((await Course.get_all()).length).toEqual(2);
    });
});

// ----------------------------------------------------------------------------

describe('Course observer tests', () => {
    class TestObserver implements CourseObserver {
        created_count = 0;
        changed_count = 0;
        course: Course | null = null;

        update_course_changed(course: Course) {
            this.course = course;
            this.changed_count += 1;
        }

        update_course_created(course: Course) {
            this.course = course;
            this.created_count += 1;
        }
    }

    let observer!: TestObserver;

    beforeEach(() => {
        reset_db();
        make_superuser();
        observer = new TestObserver();
        Course.subscribe(observer);
    });

    afterEach(() => {
       Course.unsubscribe(observer);
    });

    test('Course.create update_course_created', async () => {
        let course = await Course.create({
            name: 'Coursey'
        });

        expect(observer.course).toEqual(course);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });

    test('Course.save update_course_changed', async () => {
        let course = await Course.create({
            name: 'Coursey'
        });

        let old_timestamp = course.last_modified;
        await course.save();

        expect(observer.course).toEqual(course);
        expect(observer.course!.last_modified).not.toEqual(old_timestamp);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
    });

    test('Course.copy update_course_created', async () => {
        let course = await Course.create({
            name: 'Coursey'
        });

        let clone = await course.copy('New Coursey', Semester.fall, 2019);

        expect(observer.course).toEqual(clone);
        expect(observer.created_count).toEqual(2);
        expect(observer.changed_count).toEqual(0);
    });

    test('Course.refresh last_modified different update_course_changed', async () => {
        let course = await Course.create({
            name: 'Coursey'
        });

        let old_timestamp = course.last_modified;

        let rename = `
from autograder.core.models import Course
c = Course.objects.get(pk=${course.pk})
c.validate_and_update(name='Renamed')
        `;

        run_in_django_shell(rename);

        await course.refresh();
        expect(observer.course).toEqual(course);
        expect(observer.course!.last_modified).not.toEqual(old_timestamp);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
    });

    test('Course.refresh last_modified unchanged', async () => {
        let course = await Course.create({
            name: 'Coursey'
        });

        let old_timestamp = course.last_modified;
        await course.refresh();

        expect(observer.course).toEqual(course);
        expect(observer.course!.last_modified).toEqual(old_timestamp);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });

    test('Unsubscribe', async () => {
        let course = await Course.create({
            name: 'Coursey'
        });

        expect(observer.course).toEqual(course);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        Course.unsubscribe(observer);

        await course.save();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
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
        expect(usernames).toEqual(['admin1', 'admin2', 'admin3', SUPERUSER_NAME]);
    });

    test('Add admins', async () => {
        await course.add_admins(['new_admin1', 'new_admin2']);
        let admins = await course.get_admins();
        expect(admins.length).toEqual(3);
        let usernames = admins.map(user => user.username);
        usernames.sort();
        expect(usernames).toEqual([SUPERUSER_NAME, 'new_admin1', 'new_admin2']);
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
        expect(usernames).toEqual(['admin2', SUPERUSER_NAME]);
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
course.staff.add(*User.objects.exclude(username='${SUPERUSER_NAME}'))
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
course.students.add(*User.objects.exclude(username='${SUPERUSER_NAME}'))
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
course.handgraders.add(*User.objects.exclude(username='${SUPERUSER_NAME}'))
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
