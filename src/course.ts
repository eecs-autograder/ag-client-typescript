import { SaveableAPIObject } from "./base";
import { HttpClient, HttpResponse } from "./http_client";
import { User, UserData } from "./user";
import { filter_keys, safe_assign } from "./utils";

export class CourseData {
    pk: number;
    name: string;
    semester: Semester | null;
    year: number | null;
    subtitle: string;
    num_late_days: number;
    allowed_guest_domain: string;
    last_modified: string;

    constructor({pk,
                 name,
                 semester,
                 year,
                 subtitle,
                 num_late_days,
                 allowed_guest_domain,
                 last_modified}: CourseData) {
        this.pk = pk;
        this.name = name;
        this.semester = semester;
        this.year = year;
        this.subtitle = subtitle;
        this.num_late_days = num_late_days;
        this.allowed_guest_domain = allowed_guest_domain;
        this.last_modified = last_modified;
    }
}

export interface AllCourses {
    courses_is_admin_for: Course[];
    courses_is_staff_for: Course[];
    courses_is_student_in: Course[];
    courses_is_handgrader_for: Course[];
}

export interface CourseObserver {
    update_course_created(course: Course): void;
    update_course_changed(course: Course): void;
}

export class Course extends CourseData implements SaveableAPIObject {
    private static _subscribers = new Set<CourseObserver>();

    static subscribe(observer: CourseObserver) {
        Course._subscribers.add(observer);
    }

    static unsubscribe(observer: CourseObserver) {
        Course._subscribers.delete(observer);
    }

    static notify_course_created(course: Course) {
        for (let subscriber of Course._subscribers) {
            subscriber.update_course_created(course);
        }
    }

    static notify_course_changed(course: Course) {
        for (let subscriber of Course._subscribers) {
            subscriber.update_course_changed(course);
        }
    }

    static async create(data: NewCourseData) {
        let response = await HttpClient.get_instance().post<CourseData>(`/courses/`, data);
        let course = new Course(response.data);
        Course.notify_course_created(course);
        return course;
    }

    static async get_all() {
        let response = await HttpClient.get_instance().get<CourseData[]>(`/courses/`);
        return response.data.map(course_data => new Course(course_data));
    }

    static async get_courses_for_user(user: User): Promise<AllCourses> {
        let [admin_courses,
             staff_courses,
             student_courses,
             handgrader_courses] = await Promise.all([
                 user.courses_is_admin_for(),
                 user.courses_is_staff_for(),
                 user.courses_is_student_in(),
                 user.courses_is_handgrader_for()
        ]);
        return {
            courses_is_admin_for: admin_courses,
            courses_is_staff_for: staff_courses,
            courses_is_student_in: student_courses,
            courses_is_handgrader_for: handgrader_courses,
        };
    }

    static async get_by_pk(pk: number) {
        let response = await HttpClient.get_instance().get<CourseData>(`/courses/${pk}/`);
        return new Course(response.data);
    }

    static async get_by_fields(name: string, semester: Semester, year: number) {
        let response = await HttpClient.get_instance().get<CourseData>(
            `/course/${name}/${semester}/${year}/`
        );
        return new Course(response.data);
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<CourseData>(
            `/courses/${this.pk}/`, filter_keys(this, Course.EDITABLE_FIELDS)
        );
        safe_assign(this, response.data);
        Course.notify_course_changed(this);
    }

    delete(): Promise<HttpResponse> {
        return HttpClient.get_instance().delete(`/courses/${this.pk}/`);
    }

    static readonly EDITABLE_FIELDS: (keyof CourseData)[] = [
        'name',
        'semester',
        'year',
        'subtitle',
        'num_late_days',
        'allowed_guest_domain'
    ];

    async copy(new_name: string, new_semester: Semester, new_year: number) {
        let response = await HttpClient.get_instance().post<CourseData>(
            `/courses/${this.pk}/copy/`,
            {
                new_name: new_name,
                new_semester: new_semester,
                new_year: new_year
            });
        let course = new Course(response.data);
        Course.notify_course_created(course);
        return course;
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<CourseData>(`/courses/${this.pk}/`);
        safe_assign(this, response.data);

        if (last_modified !== this.last_modified) {
            Course.notify_course_changed(this);
        }
    }

    async get_admins(): Promise<User[]> {
        let response = await HttpClient.get_instance().get<UserData[]>(
            `/courses/${this.pk}/admins/`);
        return response.data.map(user_data => new User(user_data));
    }

    add_admins(usernames: string[]): Promise<HttpResponse> {
        return HttpClient.get_instance().post(
            `/courses/${this.pk}/admins/`, {'new_admins': usernames});
    }

    remove_admins(users: User[]): Promise<HttpResponse> {
        return HttpClient.get_instance().patch(
            `/courses/${this.pk}/admins/`, {'remove_admins': users});
    }

    async get_staff(): Promise<User[]> {
        let response = await HttpClient.get_instance().get<UserData[]>(
            `/courses/${this.pk}/staff/`);
        return response.data.map(user_data => new User(user_data));
    }

    add_staff(usernames: string[]): Promise<HttpResponse> {
        return HttpClient.get_instance().post(
            `/courses/${this.pk}/staff/`, {'new_staff': usernames});
    }

    remove_staff(users: User[]): Promise<HttpResponse> {
        return HttpClient.get_instance().patch(
            `/courses/${this.pk}/staff/`, {'remove_staff': users});
    }

    async get_students(): Promise<User[]> {
        let response = await HttpClient.get_instance().get<UserData[]>(
            `/courses/${this.pk}/students/`);
        return response.data.map(user_data => new User(user_data));
    }

    add_students(usernames: string[]): Promise<HttpResponse> {
        return HttpClient.get_instance().post(
            `/courses/${this.pk}/students/`, {'new_students': usernames});
    }

    remove_students(users: User[]): Promise<HttpResponse> {
        return HttpClient.get_instance().patch(
            `/courses/${this.pk}/students/`, {'remove_students': users});
    }

    set_students(usernames: string[]): Promise<HttpResponse> {
        return HttpClient.get_instance().put(
            `/courses/${this.pk}/students/`, {'new_students': usernames});
    }

    async get_handgraders(): Promise<User[]> {
        let response = await HttpClient.get_instance().get<UserData[]>(
            `/courses/${this.pk}/handgraders/`);
        return response.data.map(user_data => new User(user_data));
    }

    add_handgraders(usernames: string[]): Promise<HttpResponse> {
        return HttpClient.get_instance().post(
            `/courses/${this.pk}/handgraders/`, {'new_handgraders': usernames});
    }

    remove_handgraders(users: User[]): Promise<HttpResponse> {
        return HttpClient.get_instance().patch(
            `/courses/${this.pk}/handgraders/`, {'remove_handgraders': users});
    }
}

export class NewCourseData {
    name: string;
    semester?: Semester | null;
    year?: number | null;
    subtitle?: string;
    num_late_days?: number;

    constructor({
        name,
        semester,
        year,
        subtitle,
        num_late_days,
    }: NewCourseData) {
        this.name = name;
        this.semester = semester;
        this.year = year;
        this.subtitle = subtitle;
        this.num_late_days = num_late_days;
    }
}

export enum Semester {
    fall = 'Fall',
    winter = 'Winter',
    spring = 'Spring',
    summer = 'Summer',
}
